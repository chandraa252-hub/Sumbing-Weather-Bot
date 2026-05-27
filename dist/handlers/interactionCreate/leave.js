"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leave = leave;
const voice_1 = require("@discordjs/voice");
const environment_1 = require("../../environment");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
const timer_1 = require("../../services/timer");
const sleepcall_1 = require("../../services/sleepcall");
async function leave(interaction, scope) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const config = await persistence_1.configRepo.get(guildId);
    const isID = config.languageKey === "id";
    // Stop timer if running
    const timerRunning = await persistence_1.timerRepo.exists(guildId);
    if (timerRunning) {
        await (0, timer_1.stopTimer)(guildId, scope);
        logger_1.default.info(guildId, "Timer stopped by /leave");
    }
    // Stop sleepcall if running
    if ((0, sleepcall_1.isSleepcallActive)(guildId)) {
        (0, sleepcall_1.stopSleepcall)(guildId);
        await persistence_1.sleepcallRepo.remove(guildId);
        logger_1.default.info(guildId, "Sleepcall stopped by /leave");
    }
    let disconnected = false;
    const conn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
    if (conn) {
        logger_1.default.info(guildId, `Leave: disconnecting VoiceConnection from VC:${conn.joinConfig.channelId}`);
        conn.disconnect();
        conn.destroy();
        disconnected = true;
    }
    const botVoice = guild.members.me?.voice;
    if (botVoice?.channelId) {
        try {
            await botVoice.disconnect();
            logger_1.default.info(guildId, "Leave: Gateway voice disconnect successful");
            disconnected = true;
        }
        catch (e) {
            logger_1.default.warn(guildId, `Leave: Gateway voice disconnect failed: ${e}`);
        }
    }
    await interaction.editReply(disconnected
        ? (isID ? "Bot telah keluar dari voice channel." : "Bot has left the voice channel.")
        : (isID ? "Bot tidak sedang di voice channel." : "Bot is not in a voice channel."));
}
