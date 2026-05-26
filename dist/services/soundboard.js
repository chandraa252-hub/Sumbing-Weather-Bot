"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSounds = listSounds;
exports.getSoundPath = getSoundPath;
exports.playSound = playSound;
const voice_1 = require("@discordjs/voice");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./logger"));
const SOUNDS_DIR = path_1.default.join(process.cwd(), "sounds");
const SUPPORTED_EXTENSIONS = [".mp3", ".ogg", ".wav"];
function toTitleCase(str) {
    return str.replace(/[-_]/g, " ").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
function listSounds() {
    if (!fs_1.default.existsSync(SOUNDS_DIR))
        return [];
    return fs_1.default.readdirSync(SOUNDS_DIR)
        .filter((file) => SUPPORTED_EXTENSIONS.includes(path_1.default.extname(file).toLowerCase()))
        .map((file) => {
        const value = path_1.default.basename(file, path_1.default.extname(file));
        return { name: toTitleCase(value), value };
    })
        .sort((a, b) => a.name.localeCompare(b.name));
}
function getSoundPath(soundName) {
    for (const ext of SUPPORTED_EXTENSIONS) {
        const filePath = path_1.default.join(SOUNDS_DIR, `${soundName}${ext}`);
        if (fs_1.default.existsSync(filePath))
            return filePath;
    }
    return undefined;
}
async function playSound(soundName, connection) {
    if (connection.state.status !== voice_1.VoiceConnectionStatus.Ready)
        return false;
    const soundPath = getSoundPath(soundName);
    if (!soundPath) {
        logger_1.default.info(connection.joinConfig.guildId, `Sound not found: ${soundName}`);
        return false;
    }
    logger_1.default.info(connection.joinConfig.guildId, `Playing sound: ${soundName}`);
    await new Promise((resolve, reject) => {
        const player = (0, voice_1.createAudioPlayer)();
        const subscription = connection.subscribe(player);
        const resource = (0, voice_1.createAudioResource)(soundPath);
        player.play(resource);
        player.on("error", (err) => {
            subscription?.unsubscribe();
            reject(err);
        });
        const timeout = setTimeout(() => {
            player.stop();
            subscription?.unsubscribe();
            resolve();
        }, 15_000);
        resource.playStream.on("end", () => {
            clearTimeout(timeout);
            subscription?.unsubscribe();
            resolve();
        });
    });
    return true;
}
