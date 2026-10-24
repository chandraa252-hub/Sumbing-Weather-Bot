import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { getAudioUrl } from "google-tts-api";
import { resolve } from "node:path";
import { environment } from "./environment";
import { LANGUAGES } from "./languages";
import { LanguageKey, Locale, SpeechCommand, SpeechSegment } from "./languages/types";
import logger from "./services/logger";
import { download } from "./util/download";
import { getTime } from "./util/time";
import {
    getExponentialRetryDelayMs,
    getLateRepeatCount,
    shouldSkipLateAnnouncement,
} from "./countdownPolicy";

const speechQueues = new Map<string, Promise<void>>();
function toSegments(speech: SpeechCommand): SpeechSegment[] {
    return typeof speech === "string" ? [{ text: speech }] : speech;
}

interface PreparedSpeech {
    segments: SpeechSegment[];
    filenames: string[];
}

async function prepareSpeech(speech: SpeechCommand, locale: Locale): Promise<PreparedSpeech> {
    const segments = toSegments(speech);
    const filenames = await Promise.all(
        segments.map(({ text }) =>
            download(
                getAudioUrl(text, {
                    lang: locale,
                    slow: false,
                    host: "https://translate.google.com",
                })
            )
        )
    );
    return { segments, filenames };
}

export async function prepareSpeechCommand(
    command: string,
    args: Record<string, unknown>,
    languageKey: LanguageKey
): Promise<void> {
    const language = LANGUAGES.find((candidate) => candidate.key === languageKey);
    if (!language || language.audioCommands) {
        return;
    }

    const speech = language.voiceCommands[command]?.(args);
    if (speech === undefined) {
        return;
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await prepareSpeech(speech, language.locale);
            return;
        } catch (error) {
            if (attempt === 3) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
    }
}

async function playPreparedSpeech(
    prepared: PreparedSpeech,
    connection: VoiceConnection
): Promise<void> {
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        throw new Error(`Voice connection is not ready (state: ${connection.state.status})`);
    }

    if (environment.logging.speak) {
        logger.info(
            connection.joinConfig.guildId,
            `Speak: "${prepared.segments.map(({ text }) => text).join(" [pause] ")}"`
        );
    }

    const player = createAudioPlayer();
    const subscription = connection.subscribe(player);

    try {
        for (const [index, filename] of prepared.filenames.entries()) {
            await playFile(player, filename);
            const pauseAfterMs = prepared.segments[index].pauseAfterMs ?? 0;
            if (pauseAfterMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, pauseAfterMs));
            }
        }
    } finally {
        subscription?.unsubscribe();
        player.stop(true);
    }
}

async function playAudioFile(
    audioPath: string,
    command: string,
    connection: VoiceConnection
): Promise<void> {
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        throw new Error(`Voice connection is not ready (state: ${connection.state.status})`);
    }

    if (environment.logging.speak) {
        logger.info(connection.joinConfig.guildId, `Play MP3 countdown cue "${command}"`);
    }

    const player = createAudioPlayer();
    const subscription = connection.subscribe(player);
    const playbackStartedAt = Date.now();

    try {
        await playFile(player, resolve(process.cwd(), audioPath));
        logger.info(
            connection.joinConfig.guildId,
            `MP3 countdown cue "${command}" playback finished after ${Date.now() - playbackStartedAt}ms`
        );
    } catch (error) {
        logger.warn(
            connection.joinConfig.guildId,
            `MP3 countdown cue "${command}" playback failed after ${Date.now() - playbackStartedAt}ms: ${error}`
        );
        throw error;
    } finally {
        subscription?.unsubscribe();
        player.stop(true);
    }
}

export async function speak(speech: SpeechCommand, locale: Locale, connection: VoiceConnection): Promise<void> {
    await playPreparedSpeech(await prepareSpeech(speech, locale), connection);
}

async function playFile(player: ReturnType<typeof createAudioPlayer>, filename: string): Promise<void> {
    const resource = createAudioResource(filename);

    await new Promise<void>((resolve, reject) => {
        let settled = false;
        let playbackStarted = false;

        const cleanup = () => {
            clearTimeout(timeout);
            player.removeListener("error", onError);
            player.removeListener("stateChange", onStateChange);
        };

        const finish = (error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };

        const onError = (error: Error) => finish(error);
        const onStateChange = (_oldState: unknown, newState: { status: string }) => {
            if (newState.status === AudioPlayerStatus.Playing) {
                playbackStarted = true;
            }
            if (newState.status === AudioPlayerStatus.Idle && playbackStarted) {
                finish();
            }
        };
        const timeout = setTimeout(() => finish(new Error("Voice audio playback timed out")), 30_000);

        player.on("error", onError);
        player.on("stateChange", onStateChange);
        player.play(resource);
    });
}

interface SpeechCommandOptions {
    /**
     * Epoch seconds when this countdown announcement was due.
     * Stale announcements are skipped only when a maximum delay is specified.
     */
    dueAt?: number;
    maxDelaySeconds?: number;
    repeatIfLateAfterSeconds?: number;
    retryUntilReady?: boolean;
    connectionProvider?: () => Promise<VoiceConnection | undefined>;
    isCurrentCycle?: () => boolean;
}

export async function speakCommand(
    command: string,
    args: Record<string, unknown>,
    connection: VoiceConnection,
    languageKey: LanguageKey,
    options: SpeechCommandOptions = {}
): Promise<void> {
    const language = LANGUAGES.find((candidate) => candidate.key === languageKey);
    if (!language) {
        return;
    }

    const { locale, voiceCommands, audioCommands } = language;
    const audioPath = audioCommands?.[command];
    if ((audioCommands && !audioPath) || (!audioCommands && !voiceCommands[command])) {
        return;
    }
    const speech = audioPath ? undefined : voiceCommands[command](args);
    const text = audioPath
        ? `MP3 countdown cue "${command}"`
        : toSegments(speech!).map(({ text }) => text).join(" / ");
    const guildId = connection.joinConfig.guildId;
    let activeConnection = connection;
    let firstPlaybackCompleted = false;
    let repeatRequired = false;
    let repeatCompleted = false;
    const previous = speechQueues.get(guildId) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(async () => {
            const skipIfStale = () => {
                if (options.isCurrentCycle && !options.isCurrentCycle()) {
                    logger.info(guildId, `Skipping voice announcement "${text}" because its timer cycle is no longer active`);
                    return true;
                }

                if (options.dueAt === undefined || options.maxDelaySeconds === undefined) {
                    return false;
                }

                const delay = getTime() - options.dueAt;
                if (!shouldSkipLateAnnouncement(delay, options.maxDelaySeconds)) {
                    return false;
                }
                logger.info(guildId, `Skipping stale voice announcement "${text}" (${delay}s late)`);
                return true;
            };

            let attempt = 0;
            while (true) {
                attempt += 1;
                if (skipIfStale()) {
                    return;
                }

                try {
                    const latestConnection = await options.connectionProvider?.();
                    if (latestConnection) {
                        activeConnection = latestConnection;
                    }
                    await entersState(activeConnection, VoiceConnectionStatus.Ready, 5_000);
                    if (skipIfStale()) {
                        return;
                    }

                    const prepared = audioPath ? undefined : await prepareSpeech(speech!, locale);
                    if (skipIfStale()) {
                        return;
                    }
                    const playAnnouncement = () =>
                        audioPath
                            ? playAudioFile(audioPath, command, activeConnection)
                            : playPreparedSpeech(prepared!, activeConnection);
                    if (!firstPlaybackCompleted) {
                        const delaySeconds =
                            options.dueAt === undefined ? 0 : getTime() - options.dueAt;
                        repeatRequired =
                            !audioPath &&
                            options.repeatIfLateAfterSeconds !== undefined &&
                            getLateRepeatCount(delaySeconds, options.repeatIfLateAfterSeconds) > 0;
                        await playAnnouncement();
                        firstPlaybackCompleted = true;
                        if (repeatRequired) {
                            logger.info(
                                guildId,
                                `Repeating late voice announcement "${text}" (${delaySeconds}s late)`
                            );
                        }
                    }
                    if (repeatRequired && !repeatCompleted) {
                        if (skipIfStale()) {
                            return;
                        }
                        await playAnnouncement();
                        repeatCompleted = true;
                    }
                    return;
                } catch (error) {
                    if (skipIfStale()) {
                        return;
                    }
                    if (!options.retryUntilReady) {
                        throw error;
                    }
                    const retryDelayMs = getExponentialRetryDelayMs(attempt);
                    logger.warn(
                        guildId,
                        `Voice announcement attempt ${attempt} failed; retrying in ${retryDelayMs}ms: ${error}`
                    );
                    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                }
            }
        });
    speechQueues.set(guildId, current);

    try {
        await current;
    } finally {
        if (speechQueues.get(guildId) === current) {
            speechQueues.delete(guildId);
        }
    }
}
