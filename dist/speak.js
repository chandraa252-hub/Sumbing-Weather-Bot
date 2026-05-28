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
const sleepcall_1 = require("./services/sleepcall");
async function speak(text, locale, connection) {
    if (connection.state.status !== voice_1.VoiceConnectionStatus.Ready) {
        return;
    }
    if (environment_1.environment.logging.speak) {
        logger_1.default.info(connection.joinConfig.guildId, `Speak: "${text}"`);
    }
    const guildId = connection.joinConfig.guildId;
    const wasActive = (0, sleepcall_1.isSleepcallActive)(guildId);
    if (wasActive) (0, sleepcall_1.duckSleepcall)(guildId);
    try {
    await new Promise(async (resolve, reject) => {
        const url = (0, google_tts_api_1.getAudioUrl)(text, {
            lang: locale,
            slow: false,
            host: "https://translate.google.com",
        });
        const player = (0, voice_1.createAudioPlayer)();
        const subscription = connection.subscribe(player);
        const filename = await (0, download_1.download)(url);
        const resource = (0, voice_1.createAudioResource)(filename);
        player.play(resource);
        player.on("error", reject);
        const timeout = setTimeout(() => {
            player.stop();
            subscription?.unsubscribe();
            resolve();
        }, 5_000);
        resource.playStream.on("end", () => {
            clearTimeout(timeout);
            subscription?.unsubscribe();
            resolve();
        });
    });
    } finally {
        if (wasActive) (0, sleepcall_1.unduckSleepcall)(guildId);
    }
}
async function speakCommand(command, args, connection, languageKey) {
    const { locale, voiceCommands } = languages_1.LANGUAGES.find((language) => language.key === languageKey);
    if (!voiceCommands[command]) {
        return;
    }
    const text = voiceCommands[command](args);
    await speak(text, locale, connection);
}
