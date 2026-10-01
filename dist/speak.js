"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareSpeechCommand = prepareSpeechCommand;
exports.speak = speak;
exports.speakCommand = speakCommand;
const voice_1 = require("@discordjs/voice");
const google_tts_api_1 = require("google-tts-api");
const environment_1 = require("./environment");
const languages_1 = require("./languages");
const logger_1 = __importDefault(require("./services/logger"));
const download_1 = require("./util/download");
const time_1 = require("./util/time");
const countdownPolicy_1 = require("./countdownPolicy");
const speechQueues = new Map();
function toSegments(speech) {
    return typeof speech === "string" ? [{ text: speech }] : speech;
}
async function prepareSpeech(speech, locale) {
    const segments = toSegments(speech);
    const filenames = await Promise.all(segments.map(({ text }) => (0, download_1.download)((0, google_tts_api_1.getAudioUrl)(text, {
        lang: locale,
        slow: false,
        host: "https://translate.google.com",
    }))));
    return { segments, filenames };
}
async function prepareSpeechCommand(command, args, languageKey) {
    const language = languages_1.LANGUAGES.find((candidate) => candidate.key === languageKey);
    const speech = language?.voiceCommands[command]?.(args);
    if (!language || speech === undefined) {
        return;
    }
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await prepareSpeech(speech, language.locale);
            return;
        }
        catch (error) {
            if (attempt === 3) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
    }
}
async function playPreparedSpeech(prepared, connection) {
    if (connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
        throw new Error(`Voice connection is not ready (state: ${connection.state.status})`);
    }
    if (environment_1.environment.logging.speak) {
        logger_1.default.info(connection.joinConfig.guildId, `Speak: "${prepared.segments.map(({ text }) => text).join(" [pause] ")}"`);
    }
    const player = (0, voice_1.createAudioPlayer)();
    const subscription = connection.subscribe(player);
    try {
        for (const [index, filename] of prepared.filenames.entries()) {
            await playFile(player, filename);
            const pauseAfterMs = prepared.segments[index].pauseAfterMs ?? 0;
            if (pauseAfterMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, pauseAfterMs));
            }
        }
    }
    finally {
        subscription?.unsubscribe();
        player.stop(true);
    }
}
async function speak(speech, locale, connection) {
    await playPreparedSpeech(await prepareSpeech(speech, locale), connection);
}
async function playFile(player, filename) {
    const resource = (0, voice_1.createAudioResource)(filename);
    await new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            clearTimeout(timeout);
            player.removeListener("error", onError);
            player.removeListener("stateChange", onStateChange);
        };
        const finish = (error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        };
        const onError = (error) => finish(error);
        const onStateChange = (_oldState, newState) => {
            if (newState.status === voice_1.AudioPlayerStatus.Idle) {
                finish();
            }
        };
        const timeout = setTimeout(() => finish(new Error("Voice audio playback timed out")), 30_000);
        player.on("error", onError);
        player.on("stateChange", onStateChange);
        player.play(resource);
    });
}
async function speakCommand(command, args, connection, languageKey, options = {}) {
    const language = languages_1.LANGUAGES.find((candidate) => candidate.key === languageKey);
    if (!language) {
        return;
    }
    const { locale, voiceCommands } = language;
    if (!voiceCommands[command]) {
        return;
    }
    const speech = voiceCommands[command](args);
    const text = toSegments(speech).map(({ text }) => text).join(" / ");
    const guildId = connection.joinConfig.guildId;
    let activeConnection = connection;
    let firstPlaybackCompleted = false;
    let repeatRequired = false;
    let repeatCompleted = false;
    const previous = speechQueues.get(guildId) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(async () => {
        const isStale = () => {
            if (options.dueAt === undefined || options.maxDelaySeconds === undefined) {
                return false;
            }
            const delay = (0, time_1.getTime)() - options.dueAt;
            return (0, countdownPolicy_1.shouldSkipLateAnnouncement)(delay, options.maxDelaySeconds);
        };
        const skipIfStale = () => {
            if (!isStale()) {
                return false;
            }
            const delay = (0, time_1.getTime)() - (options.dueAt ?? (0, time_1.getTime)());
            logger_1.default.info(guildId, `Skipping stale voice announcement "${text}" (${delay}s late)`);
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
                await (0, voice_1.entersState)(activeConnection, voice_1.VoiceConnectionStatus.Ready, 5_000);
                if (skipIfStale()) {
                    return;
                }
                const prepared = await prepareSpeech(speech, locale);
                if (skipIfStale()) {
                    return;
                }
                if (!firstPlaybackCompleted) {
                    const delaySeconds = options.dueAt === undefined ? 0 : (0, time_1.getTime)() - options.dueAt;
                    repeatRequired =
                        options.repeatIfLateAfterSeconds !== undefined &&
                            (0, countdownPolicy_1.getLateRepeatCount)(delaySeconds, options.repeatIfLateAfterSeconds) > 0;
                    await playPreparedSpeech(prepared, activeConnection);
                    firstPlaybackCompleted = true;
                    if (repeatRequired) {
                        logger_1.default.info(guildId, `Repeating late voice announcement "${text}" (${delaySeconds}s late)`);
                    }
                }
                if (repeatRequired && !repeatCompleted) {
                    await playPreparedSpeech(prepared, activeConnection);
                    repeatCompleted = true;
                }
                return;
            }
            catch (error) {
                if (skipIfStale()) {
                    return;
                }
                if (!options.retryUntilReady) {
                    throw error;
                }
                const retryDelayMs = (0, countdownPolicy_1.getExponentialRetryDelayMs)(attempt);
                logger_1.default.warn(guildId, `Voice announcement attempt ${attempt} failed; retrying in ${retryDelayMs}ms: ${error}`);
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
        }
    });
    speechQueues.set(guildId, current);
    try {
        await current;
    }
    finally {
        if (speechQueues.get(guildId) === current) {
            speechQueues.delete(guildId);
        }
    }
}
