"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = stop;
const voice_1 = require("@discordjs/voice");
const environment_1 = require("../../environment");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
const timer_1 = require("../../services/timer");
async function stop(interaction, scope) {
    const guildId = interaction.guildId;
    if (!(await persistence_1.timerRepo.exists(guildId))) {
        logger_1.default.info(guildId, "Timer is not running");
        await interaction.editReply("Timer is not running");
        return;
    }
    logger_1.default.info(guildId, "Stopping timer");
    await (0, timer_1.stopTimer)(guildId, scope);
    const connection = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
    if (connection !== undefined) {
        logger_1.default.info(guildId, `Disconnecting from VC:${connection.joinConfig.channelId}`);
        connection.disconnect();
        connection.destroy();
    }
    await interaction.editReply("Timer stopped");
}
