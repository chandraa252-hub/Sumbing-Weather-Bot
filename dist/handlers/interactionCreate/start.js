"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const discord_js_1 = require("discord.js");
const persistence_1 = require("../../persistence");
const persistence_2 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
const permissions_1 = require("../../services/permissions");
const timer_1 = require("../../services/timer");
const getVoiceConnection_1 = require("../../util/getVoiceConnection");
async function resolveGuildMember(guild, interaction) {
    const member = interaction.member;
    if (member instanceof discord_js_1.GuildMember) {
        return member;
    }
    try {
        return await guild.members.fetch(interaction.user.id);
    }
    catch {
        return null;
    }
}
async function start(interaction, scope) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const [timerRunning, config] = await Promise.all([persistence_2.timerRepo.exists(guildId), persistence_1.configRepo.get(guildId)]);
    if (timerRunning) {
        logger_1.default.info(guildId, "Timer is already running");
        await interaction.editReply("Timer is already running");
        return;
    }
    if (!(0, permissions_1.hasVoicePermissions)(guild)) {
        const invite = (0, permissions_1.getInviteUrl)();
        await interaction.editReply(`I don't have enough permissions to join the voice channel. Please use this link to grant more permissions: <${invite}>.`);
        return;
    }
    const member = await resolveGuildMember(guild, interaction);
    if (!member?.voice.channel) {
        await interaction.editReply(`I don't know which voice channel to join. Join a voice channel and run \`/weather start\` again.`);
        return;
    }
    const channel = interaction.channel;
    await interaction.editReply("Timer started");
    await Promise.all([(0, getVoiceConnection_1.getVoiceConnection)(config, member, guild), (0, timer_1.addTimer)(guildId, channel, scope)]);
}
