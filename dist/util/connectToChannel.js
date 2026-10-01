"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorVoiceConnection = monitorVoiceConnection;
exports.connectToChannel = connectToChannel;
const voice_1 = require("@discordjs/voice");
const environment_1 = require("../environment");
const logger_1 = __importDefault(require("../services/logger"));
const monitoredConnections = new WeakSet();
function monitorVoiceConnection(connection) {
    if (monitoredConnections.has(connection)) {
        return;
    }
    monitoredConnections.add(connection);
    connection.on("error", (error) => {
        logger_1.default.warn(connection.joinConfig.guildId, `Voice connection error: ${error.message}`);
    });
    connection.on("stateChange", (_oldState, newState) => {
        if (newState.status === voice_1.VoiceConnectionStatus.Disconnected) {
            logger_1.default.warn(connection.joinConfig.guildId, "Voice connection disconnected; recovery will be attempted.");
        }
    });
}
async function connectToChannel(channel) {
    if (!channel.joinable)
        return undefined;
    const connection = (0, voice_1.joinVoiceChannel)({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        group: environment_1.environment.botId,
    });
    monitorVoiceConnection(connection);
    logger_1.default.info(channel.guildId, `Joined VC:${channel.id}`);
    return connection;
}
