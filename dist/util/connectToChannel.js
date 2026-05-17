"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToChannel = connectToChannel;
const voice_1 = require("@discordjs/voice");
const environment_1 = require("../environment");
const logger_1 = __importDefault(require("../services/logger"));
async function connectToChannel(channel) {
    if (!channel.joinable) {
        return undefined;
    }
    const connection = (0, voice_1.joinVoiceChannel)({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        group: environment_1.environment.botId,
    });
    logger_1.default.info(channel.guildId, `Joined VC:${channel.id}`);
    return connection;
}
