"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInteractionCreate = handleInteractionCreate;
const voice_1 = require("@discordjs/voice");
const constants_1 = require("../../constants");
const environment_1 = require("../../environment");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
const statusMessage_1 = require("../../services/statusMessage");
const timer_1 = require("../../services/timer");
const connectToChannel_1 = require("../../util/connectToChannel");
const soundboard_1 = require("../../services/soundboard");
const soundboard_2 = require("./soundboard");
const reset_1 = require("./reset");
const athletes_1 = require("./athletes");
const help_1 = require("./help");
const skip_1 = require("./skip");
const start_1 = require("./start");
const stop_1 = require("./stop");
const language_1 = require("./language");
const status_1 = require("./status");
const leave_1 = require("./leave");
const soundboard_3 = require("./soundboard");
const join_1 = require("./join");
const sleepcall_1 = require("./sleepcall");
const commandsMap = {
    [constants_1.SLASH_COMMAND.commands.help]: help_1.help,
    [constants_1.SLASH_COMMAND.commands.start]: start_1.start,
    [constants_1.SLASH_COMMAND.commands.stop]: stop_1.stop,
    [constants_1.SLASH_COMMAND.commands.athletes.name]: athletes_1.athletes,
    [constants_1.SLASH_COMMAND.commands.skip.name]: skip_1.skip,
    [constants_1.SLASH_COMMAND.commands.reset.name]: reset_1.reset,
    [constants_1.SLASH_COMMAND.commands.language]: language_1.language,
    [constants_1.SLASH_COMMAND.commands.status]: status_1.status,
    [constants_1.SLASH_COMMAND.commands.leave]: leave_1.leave,
    [constants_1.SLASH_COMMAND.commands.soundboard]: soundboard_3.soundboard,
    [constants_1.SLASH_COMMAND.commands.join]: join_1.join,
    [constants_1.SLASH_COMMAND.commands.sleepcall]: sleepcall_1.sleepcall,
};
async function handleInteractionCreate({ args: [interaction], scope }) {
    if (interaction.isButton() && interaction.inGuild()) {
        const guildId = interaction.guildId;
        const customId = interaction.customId;
        logger_1.default.info(guildId, `Button: ${customId} by ${interaction.user.id}`);
        if (customId === constants_1.BUTTON_SOUNDBOARD_OPEN) {
            await interaction.deferUpdate();
            const config = await persistence_1.configRepo.get(guildId);
            // Pre-connect to VC in background so connection is ready before sound button pressed
            const member = interaction.member;
            const voiceChannelId = member?.voice?.channelId;
            if (voiceChannelId) {
                const existing = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
                if (!existing) {
                    const channel = interaction.guild?.channels.cache.get(voiceChannelId);
                    if (channel) {
                        (0, connectToChannel_1.connectToChannel)(channel).catch(() => {});
                    }
                }
            }
            await interaction.followUp({ ...(0, soundboard_2.createSoundboardPanel)(config.languageKey), ephemeral: true });
            return;
        }
        if (customId === constants_1.BUTTON_SOUNDBOARD_CLOSE) {
            await interaction.deferUpdate();
            await interaction.deleteReply().catch(() => { });
            return;
        }
        if (customId.startsWith(constants_1.BUTTON_SOUND_PREFIX)) {
            await interaction.deferUpdate();
            const soundName = customId.slice(constants_1.BUTTON_SOUND_PREFIX.length);
            const member = interaction.member;
            const voiceChannelId = member?.voice?.channelId;
            if (!voiceChannelId) {
                await interaction.followUp({ content: "❌ Kamu harus berada di voice channel terlebih dahulu.", ephemeral: true });
                return;
            }
            let conn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
            if (!conn) {
                const channel = interaction.guild?.channels.cache.get(voiceChannelId);
                if (channel) {
                    conn = await (0, connectToChannel_1.connectToChannel)(channel) ?? undefined;
                }
            }
            if (!conn) {
                await interaction.followUp({ content: "❌ Tidak bisa bergabung ke voice channel.", ephemeral: true });
                return;
            }
            const played = await (0, soundboard_1.playSound)(soundName, conn);
            if (!played) {
                await interaction.followUp({ content: `❌ Audio tidak ditemukan: \`${soundName}\``, ephemeral: true });
            }
            return;
        }
        await interaction.deferUpdate();
        const timer = await persistence_1.timerRepo.get(guildId);
        if (!timer)
            return;
        if (timer.status?.channelId !== interaction.channelId ||
            timer.status?.messageId !== interaction.message.id) {
            return;
        }
        switch (customId) {
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
                const botVoice = interaction.guild?.members.me?.voice;
                if (botVoice?.channelId) {
                    try {
                        await botVoice.disconnect();
                    }
                    catch { }
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
