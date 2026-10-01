"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTimerLoop = startTimerLoop;
const node_1 = require("@sentry/node");
const perf_hooks_1 = require("perf_hooks");
const persistence_1 = require("./persistence");
const persistence_2 = require("./persistence");
const persistence_3 = require("./persistence");
const logger_1 = __importDefault(require("./services/logger"));
const statusMessage_1 = require("./services/statusMessage");
const timer_1 = require("./services/timer");
const globalTimer_1 = require("./services/globalTimer");
const countdownPolicy_1 = require("./countdownPolicy");
const speak_1 = require("./speak");
const getVoiceConnection_1 = require("./util/getVoiceConnection");
const time_1 = require("./util/time");
const INTERVAL = 1_000;
const STATUS_UPDATE_INTERVAL = 10;
let timerLoopStart;
const guildTickQueues = new Map();
const announcedByTimer = new Map();
const statusUpdateStates = new Map();
function startTimerLoop() {
    logger_1.default.info(undefined, "Starting timer loop");
    timerLoopStart = perf_hooks_1.performance.now();
    scheduleTick();
}
/**
 * @source: https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
 */
async function scheduleTick() {
    try {
        await tick();
    }
    catch (error) {
        logger_1.default.warn(undefined, `Timer loop tick failed; retrying: ${error}`);
    }
    const now = perf_hooks_1.performance.now();
    const elapsed = now - timerLoopStart;
    const roundedElapsed = Math.round(elapsed / INTERVAL) * INTERVAL;
    const targetNext = timerLoopStart + roundedElapsed + INTERVAL;
    const delay = Math.max(0, targetNext - perf_hooks_1.performance.now());
    setTimeout(scheduleTick, delay);
}
let prevTickTime;
async function tick() {
    const time = (0, time_1.getTime)();
    if (time !== prevTickTime) {
        const timers = await persistence_2.timerRepo.getAll();
        timers
            .filter((timer) => timer !== undefined)
            .forEach((timer) => enqueueTimerTick(timer, time));
    }
    prevTickTime = time;
}
/**
 * Keep each guild's timer state transition serial. Voice playback is queued
 * separately so a slow TTS request cannot block the countdown.
 */
function enqueueTimerTick(timer, now) {
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
function enqueueStatusUpdate(guildId, scope) {
    const state = statusUpdateStates.get(guildId) ?? { pending: false, running: false };
    statusUpdateStates.set(guildId, state);
    state.pending = true;
    if (state.running) {
        return;
    }
    state.running = true;
    void processStatusUpdates(guildId, state, scope);
}
async function processStatusUpdates(guildId, state, scope) {
    try {
        while (state.pending) {
            state.pending = false;
            await (0, statusMessage_1.updateStatusMessage)(guildId, scope);
        }
    }
    catch (error) {
        logger_1.default.warn(guildId, `Status update worker failed; will retry: ${error}`);
    }
    finally {
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
async function tickTimer(timer, now) {
    const scope = new node_1.Scope();
    scope.setTag("handler", "timer");
    try {
        // The snapshot from getAll() may be stale if a command changed the timer
        // while this tick was queued. Always use the latest persisted state.
        const latestTimer = await persistence_2.timerRepo.get(timer.guildId);
        if (!latestTimer) {
            return;
        }
        timer = latestTimer;
        const globalState = await persistence_3.globalTimerRepo.get();
        if (!globalState) {
            return;
        }
        if (globalState.status === "running" && globalState.stopAt !== undefined && now >= globalState.stopAt) {
            await persistence_3.globalTimerRepo.set({
                ...globalState,
                status: "stopped",
                stopAt: undefined,
                updatedAt: now,
            });
            return;
        }
        const globalTimer = (0, globalTimer_1.getGlobalTimerSnapshot)(globalState, timer.guildId, now);
        if (!globalTimer) {
            return;
        }
        const config = await persistence_1.configRepo.get(timer.guildId);
        if (config.athletes.length === 0) {
            logger_1.default.warn(timer.guildId, "Timer has no configured weathers; waiting for configuration");
            return;
        }
        const wasStarted = timer.started;
        const previousAthleteIndex = timer.currentAthleteIndex;
        const previousNextChangeTime = timer.nextChangeTime;
        const globalStateChanged = timer.nextChangeTime !== globalTimer.nextChangeTime ||
            timer.currentAthleteIndex !== globalTimer.currentAthleteIndex ||
            timer.started !== globalTimer.started;
        let transitioned = globalStateChanged;
        if (globalStateChanged) {
            const updatedTimer = await persistence_2.timerRepo.update(timer.guildId, (t) => {
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
                logger_1.default.info(timer.guildId, `Timer transition: ${config.athletes[previousAthleteIndex]?.name ?? "unknown"} -> ${config.athletes[timer.currentAthleteIndex]?.name ?? "unknown"}, next change in ${config.athletes[timer.currentAthleteIndex].time}s`);
            }
        }
        // The text and the TTS announcement both use this same persisted
        // nextChangeTime. This prevents a stale Redis snapshot from making the
        // audio announce a different weather than the status message displays.
        const nextAthleteName = config.athletes[transitioned ? timer.currentAthleteIndex : (0, timer_1.getNextAthleteIndex)(config, timer)].name;
        if (timer.status && timer.started && (transitioned || now % STATUS_UPDATE_INTERVAL === 0)) {
            // Discord REST delays must not hold up the timer transition or TTS.
            // The worker coalesces ticks while an update is still in flight.
            enqueueStatusUpdate(timer.guildId, scope);
        }
        let timerAnnouncements = announcedByTimer.get(timer.guildId);
        if (!timerAnnouncements || timerAnnouncements.nextChangeTime !== timer.nextChangeTime) {
            timerAnnouncements = {
                nextChangeTime: timer.nextChangeTime,
                keys: new Set(),
                preparedKeys: new Set(),
            };
            announcedByTimer.set(timer.guildId, timerAnnouncements);
        }
        const upcomingAnnouncements = (0, countdownPolicy_1.getUpcomingAnnouncements)(timer.nextChangeTime);
        for (const announcement of upcomingAnnouncements) {
            const secondsUntilDue = announcement.dueAt - now;
            if (secondsUntilDue < 0 || secondsUntilDue > countdownPolicy_1.TTS_PREPARATION_LEAD_SECONDS) {
                continue;
            }
            const announcementKey = (0, countdownPolicy_1.getAnnouncementKey)(timer.nextChangeTime, announcement.command, config.languageKey, nextAthleteName);
            if (!(0, countdownPolicy_1.markAnnouncementOnce)(timerAnnouncements.preparedKeys, announcementKey)) {
                continue;
            }
            void (0, speak_1.prepareSpeechCommand)(announcement.command, { nextAthlete: nextAthleteName, started: wasStarted }, config.languageKey).catch((error) => {
                logger_1.default.warn(timer.guildId, `Could not prefetch voice announcement "${announcement.command}": ${error}`);
            });
        }
        // Voice is optional — failure here must NOT kill the timer or the countdown
        let connection;
        try {
            connection = await (0, getVoiceConnection_1.getVoiceConnection)(config);
            if (!connection || !connection.joinConfig.channelId) {
                return;
            }
            const dueAnnouncements = transitioned
                ? [{ command: "0", dueAt: Math.min(previousNextChangeTime, now) }]
                : (0, countdownPolicy_1.getDueCountdownAnnouncements)(timer.nextChangeTime, now);
            for (const announcement of dueAnnouncements) {
                const announcementKey = (0, countdownPolicy_1.getAnnouncementKey)(timer.nextChangeTime, announcement.command, config.languageKey, nextAthleteName);
                if (!(0, countdownPolicy_1.markAnnouncementOnce)(timerAnnouncements.keys, announcementKey)) {
                    continue;
                }
                const speechPolicy = (0, countdownPolicy_1.getAnnouncementSpeechPolicy)(announcement.command);
                void (0, speak_1.speakCommand)(announcement.command, { nextAthlete: nextAthleteName, started: wasStarted }, connection, config.languageKey, {
                    dueAt: announcement.dueAt,
                    connectionProvider: () => (0, getVoiceConnection_1.getVoiceConnection)(config),
                    ...speechPolicy,
                }).catch((voiceError) => {
                    logger_1.default.warn(timer.guildId, `Voice announcement failed: ${voiceError}`);
                });
            }
        }
        catch (voiceError) {
            logger_1.default.warn(timer.guildId, `Voice error (timer continues): ${voiceError}`);
        }
    }
    catch (e) {
        // Keep the persisted timer alive so a transient Redis/API/voice error
        // can recover on the next tick instead of stopping at zero.
        logger_1.default.error(timer.guildId, new Error(`Timer tick failed; continuing\n${e}`), scope);
    }
}
