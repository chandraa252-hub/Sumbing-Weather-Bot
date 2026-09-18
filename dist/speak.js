"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.speak = speak;
exports.speakCommand = speakCommand;
const voice_1 = require("@discordjs/voice");
const google_tts_api_1 = require("google-tts-api");
const environment_1 = require("./environment");
const languages_1 = require("./languages");
const logger_1 = __importDefault(require("./services/logger"));
const download_1 = require("./util/download");
const time_1 = require("./util/time");
const speechQueues = new Map();
const DEFAULT_MAX_ANNOUNCEMENT_DELAY_SECONDS = 3;
async function speak(text, locale, connection) {
    if (connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
        return;
    }
    if (environment_1.environment.logging.speak) {
        logger_1.default.info(connection.joinConfig.guildId, `Speak: "${text}"`);
    }
    const guildId = connection.joinConfig.guildId;
    const url = (0, google_tts_api_1.getAudioUrl)(text, {
        lang: locale,
        slow: false,
        host: "https://translate.google.com",
    });
    const player = (0, voice_1.createAudioPlayer)();
    const subscription = connection.subscribe(player);
    try {
        const filename = await (0, download_1.download)(url);
        const resource = (0, voice_1.createAudioResource)(filename);
        await new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => {
                clearTimeout(timeout);
                player.removeListener("error", onError);
                resource.playStream.removeListener("end", onEnd);
            };
            const onEnd = () => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                resolve();
            };
            const onError = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(error);
            };
            const timeout = setTimeout(() => {
                onEnd();
            }, 5_000);
            player.once("error", onError);
            resource.playStream.once("end", onEnd);
            player.play(resource);
        });
    }
    finally {
        subscription?.unsubscribe();
        player.stop(true);
    }
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
    const text = voiceCommands[command](args);
    const guildId = connection.joinConfig.guildId;
    const previous = speechQueues.get(guildId) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(async () => {
        if (options.dueAt !== undefined) {
            const maxDelay = options.maxDelaySeconds ?? DEFAULT_MAX_ANNOUNCEMENT_DELAY_SECONDS;
            const delay = (0, time_1.getTime)() - options.dueAt;
            if (delay > maxDelay) {
                logger_1.default.info(guildId, `Skipping stale voice announcement "${text}" (${delay}s late)`);
                return;
            }
        }
        await speak(text, locale, connection);
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
