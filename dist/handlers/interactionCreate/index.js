"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInteractionCreate = handleInteractionCreate;
const constants_1 = require("../../constants");
const logger_1 = __importDefault(require("../../services/logger"));
const voice_1 = require("@discordjs/voice");
const environment_1 = require("../../environment");
const statusMessage_1 = require("../../services/statusMessage");
const timer_1 = require("../../services/timer");
const persistence_1 = require("../../persistence");
const reset_1 = require("./reset");
const athletes_1 = require("./athletes");
const help_1 = require("./help");
const skip_1 = require("./skip");
const start_1 = require("./start");
const stop_1 = require("./stop");
const language_1 = require("./language");
const commandsMap = {
    [constants_1.SLASH_COMMAND.commands.help]: help_1.help,
    [constants_1.SLASH_COMMAND.commands.start]: start_1.start,
    [constants_1.SLASH_COMMAND.commands.stop]: stop_1.stop,
    [constants_1.SLASH_COMMAND.commands.athletes.name]: athletes_1.athletes,
    [constants_1.SLASH_COMMAND.commands.skip.name]: skip_1.skip,
    [constants_1.SLASH_COMMAND.commands.reset.name]: reset_1.reset,
    [constants_1.SLASH_COMMAND.commands.language]: language_1.language,
};
async function handleInteractionCreate({ args: [interaction], scope }) {
    if (interaction.isButton() && interaction.inGuild()) {
        await interaction.deferUpdate();
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        logger_1.default.info(guildId, `Button: ${interaction.customId} by ${userId}`);
        const timer = await persistence_1.timerRepo.get(guildId);
        if (!timer)
            return;
        if (timer.status?.channelId !== interaction.channelId ||
            timer.status?.messageId !== interaction.message.id) {
            return;
        }
        switch (interaction.customId) {
            case statusMessage_1.BUTTON_SKIP:
                await (0, timer_1.skipCurrentAthlete)(guildId);
                await (0, statusMessage_1.updateStatusMessage)(guildId, scope);
                break;
            case statusMessage_1.BUTTON_STOP: {
                await (0, timer_1.stopTimer)(guildId, scope);
                const conn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
                if (conn) {
                    logger_1.default.info(guildId, `Disconnecting from VC:${conn.joinConfig.channelId}`);
                    conn.disconnect();
                    conn.destroy();
                }
                break;
            }
        }
        return;
    }
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) {
        return;
    }
    const guildId = interaction.guildId;
    const commandName = interaction.commandName;
    logger_1.default.info(guildId, `Slash Command: ${commandName}`);
    await interaction.deferReply();
    const command = commandsMap[commandName];
    if (command) {
        await command(interaction, scope);
    }
    else {
        await interaction.editReply("Unsupported command");
    }
}
