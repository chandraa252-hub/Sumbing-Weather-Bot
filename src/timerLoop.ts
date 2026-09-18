import { VoiceConnection } from "@discordjs/voice";
import { Scope } from "@sentry/node";
import { performance } from "perf_hooks";
import { configRepo } from "./persistence";
import { timerRepo } from "./persistence";
import { globalTimerRepo } from "./persistence";
import logger from "./services/logger";
import { updateStatusMessage } from "./services/statusMessage";
import { getNextAthleteIndex } from "./services/timer";
import { getGlobalTimerSnapshot } from "./services/globalTimer";
import { speakCommand } from "./speak";
import { Timer } from "./types";
import { getVoiceConnection } from "./util/getVoiceConnection";
import { getTime } from "./util/time";

const INTERVAL = 1_000;
const STATUS_UPDATE_INTERVAL = 10;
const ANNOUNCEMENT_SECONDS = new Set([300, 180, 60, 30, 15, 10, 5, 2, 1]);
const MAX_ANNOUNCEMENT_DELAY_SECONDS = 3;

let timerLoopStart: number;
const guildTickQueues = new Map<string, Promise<void>>();
const lastAnnouncementKeys = new Map<string, string>();
const statusUpdateStates = new Map<string, { pending: boolean; running: boolean }>();

export function startTimerLoop() {
    logger.info(undefined, "Starting timer loop");

    timerLoopStart = performance.now();
    scheduleTick();
}

/**
 * @source: https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
 */
async function scheduleTick() {
    try {
        await tick();
    } catch (error) {
        logger.warn(undefined, `Timer loop tick failed; retrying: ${error}`);
    }

    const now = performance.now();
    const elapsed = now - timerLoopStart;
    const roundedElapsed = Math.round(elapsed / INTERVAL) * INTERVAL;
    const targetNext = timerLoopStart + roundedElapsed + INTERVAL;
    const delay = Math.max(0, targetNext - performance.now());
    setTimeout(scheduleTick, delay);
}

let prevTickTime: number | undefined;
async function tick() {
    const time = getTime();
    if (time !== prevTickTime) {
        const timers = await timerRepo.getAll();
        timers
            .filter((timer): timer is Timer => timer !== undefined)
            .forEach((timer) => enqueueTimerTick(timer, time));
    }
    prevTickTime = time;
}

/**
 * Keep each guild's timer state transition serial. Voice playback is queued
 * separately so a slow TTS request cannot block the countdown.
 */
function enqueueTimerTick(timer: Timer, now: number): void {
    const previous = guildTickQueues.get(timer.guildId) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(() => tickTimer(timer, now));

    guildTickQueues.set(timer.guildId, current);
    void current.finally(() => {
        if (guildTickQueues.get(timer.guildId) === current) {
            guildTickQueues.delete(timer.guildId);
        }
    }).catch(() => undefined);
}

function enqueueStatusUpdate(guildId: string, scope: Scope): void {
    const state = statusUpdateStates.get(guildId) ?? { pending: false, running: false };
    statusUpdateStates.set(guildId, state);
    state.pending = true;

    if (state.running) {
        return;
    }

    state.running = true;
    void processStatusUpdates(guildId, state, scope);
}

async function processStatusUpdates(
    guildId: string,
    state: { pending: boolean; running: boolean },
    scope: Scope
): Promise<void> {
    try {
        while (state.pending) {
            state.pending = false;
            await updateStatusMessage(guildId, scope);
        }
    } catch (error) {
        logger.warn(guildId, `Status update worker failed; will retry: ${error}`);
    } finally {
        if (state.pending) {
            void processStatusUpdates(guildId, state, scope);
            return;
        }

        state.running = false;
        if (statusUpdateStates.get(guildId) === state) {
            statusUpdateStates.delete(guildId);
        }
    }
}

async function tickTimer(timer: Timer, now: number): Promise<void> {
    const scope = new Scope();
    scope.setTag("handler", "timer");

    try {
        // The snapshot from getAll() may be stale if a command changed the timer
        // while this tick was queued. Always use the latest persisted state.
        const latestTimer = await timerRepo.get(timer.guildId);
        if (!latestTimer) {
            return;
        }
        timer = latestTimer;

        const globalState = await globalTimerRepo.get();
        if (!globalState) {
            return;
        }
        if (globalState.status === "running" && globalState.stopAt !== undefined && now >= globalState.stopAt) {
            await globalTimerRepo.set({
                ...globalState,
                status: "stopped",
                stopAt: undefined,
                updatedAt: now,
            });
            return;
        }

        const globalTimer = getGlobalTimerSnapshot(globalState, timer.guildId, now);
        if (!globalTimer) {
            return;
        }

        const config = await configRepo.get(timer.guildId);
        if (config.athletes.length === 0) {
            logger.warn(timer.guildId, "Timer has no configured weathers; waiting for configuration");
            return;
        }

        const wasStarted = timer.started;
        const previousAthleteIndex = timer.currentAthleteIndex;
        const globalStateChanged =
            timer.nextChangeTime !== globalTimer.nextChangeTime ||
            timer.currentAthleteIndex !== globalTimer.currentAthleteIndex ||
            timer.started !== globalTimer.started;
        let transitioned = globalStateChanged;

        if (globalStateChanged) {
            const updatedTimer = await timerRepo.update(timer.guildId, (t) => {
                return {
                    ...t,
                    nextChangeTime: globalTimer.nextChangeTime,
                    currentAthleteIndex: globalTimer.currentAthleteIndex,
                    started: globalTimer.started,
                };
            });
            if (!updatedTimer) {
                return;
            }
            timer = updatedTimer;
            if (transitioned) {
                logger.info(
                    timer.guildId,
                    `Timer transition: ${config.athletes[previousAthleteIndex]?.name ?? "unknown"} -> ${
                        config.athletes[timer.currentAthleteIndex]?.name ?? "unknown"
                    }, next change in ${config.athletes[timer.currentAthleteIndex].time}s`
                );
            }
        }

        const remainingSeconds = Math.max(timer.nextChangeTime - now, 0);
        const roundedRemainingSeconds = Math.round(remainingSeconds);

        // The text and the TTS announcement both use this same persisted
        // nextChangeTime. This prevents a stale Redis snapshot from making the
        // audio announce a different weather than the status message displays.
        const nextAthleteName = config.athletes[
            transitioned ? timer.currentAthleteIndex : getNextAthleteIndex(config, timer)
        ].name;
        const announcementCommand = transitioned
            ? "0"
            : ANNOUNCEMENT_SECONDS.has(roundedRemainingSeconds)
                ? String(roundedRemainingSeconds)
                : undefined;

        if (timer.status && timer.started && (transitioned || now % STATUS_UPDATE_INTERVAL === 0)) {
            // Discord REST delays must not hold up the timer transition or TTS.
            // The worker coalesces ticks while an update is still in flight.
            enqueueStatusUpdate(timer.guildId, scope);
        }

        // Voice is optional — failure here must NOT kill the timer or the countdown
        let connection: VoiceConnection | undefined;
        try {
            connection = await getVoiceConnection(config);

            if (!connection || !connection.joinConfig.channelId) {
                return;
            }

            if (announcementCommand) {
                const announcementKey = [
                    timer.nextChangeTime,
                    announcementCommand,
                    config.languageKey,
                    nextAthleteName,
                ].join(":");
                if (lastAnnouncementKeys.get(timer.guildId) !== announcementKey) {
                    lastAnnouncementKeys.set(timer.guildId, announcementKey);
                    const dueAt = transitioned
                        ? now
                        : timer.nextChangeTime - Number(announcementCommand);
                    // Deliberately do not await playback: the timer remains
                    // anchored to Redis while TTS is fetched/played. speak()
                    // serializes announcements per guild to prevent overlap.
                    void speakCommand(
                        announcementCommand,
                        { nextAthlete: nextAthleteName, started: wasStarted },
                        connection,
                        config.languageKey,
                        { dueAt, maxDelaySeconds: MAX_ANNOUNCEMENT_DELAY_SECONDS }
                    ).catch((voiceError) => {
                        logger.warn(timer.guildId, `Voice announcement failed: ${voiceError}`);
                    });
                }
            }
        } catch (voiceError) {
            logger.warn(timer.guildId, `Voice error (timer continues): ${voiceError}`);
        }
    } catch (e) {
        // Keep the persisted timer alive so a transient Redis/API/voice error
        // can recover on the next tick instead of stopping at zero.
        logger.error(timer.guildId, new Error(`Timer tick failed; continuing\n${e}`), scope);
    }
}
