"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMessage = adminMessage;
const discord_js_1 = require("discord.js");
const discord_1 = require("../../discord");
const persistence_1 = require("../../persistence");
const globalTimer_1 = require("../../services/globalTimer");
const logger_1 = __importDefault(require("../../services/logger"));
function canSendToChannel(guild, channel) {
    if (!channel.isSendable() || channel.isThread()) {
        return false;
    }
    const botMember = guild.members.me;
    const permissions = botMember ? channel.permissionsFor(botMember) : null;
    return permissions?.has([
        discord_js_1.PermissionFlagsBits.ViewChannel,
        discord_js_1.PermissionFlagsBits.SendMessages,
    ]) ?? false;
}
async function resolveAdminMessageChannel(guild, statusChannelId) {
    if (statusChannelId) {
        const statusChannel = await guild.channels.fetch(statusChannelId).catch(() => null);
        if (statusChannel && canSendToChannel(guild, statusChannel)) {
            return statusChannel;
        }
    }
    const systemChannel = guild.systemChannel;
    if (systemChannel && canSendToChannel(guild, systemChannel)) {
        return systemChannel;
    }
    const channels = await guild.channels.fetch();
    return channels
        .filter((channel) => channel !== null)
        .filter((channel) => channel.type === discord_js_1.ChannelType.GuildText &&
        canSendToChannel(guild, channel))
        .sort((first, second) => first.rawPosition - second.rawPosition)
        .first() ?? null;
}
async function adminMessage(interaction, _scope) {
    if (!(0, globalTimer_1.isGlobalAdmin)(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengirim pesan admin.");
        return;
    }
    const content = interaction.options.getString("message", true);
    const timers = await persistence_1.timerRepo.getAll();
    const statusChannels = new Map(timers.flatMap((timer) => timer?.status?.channelId
        ? [[timer.guildId, timer.status.channelId]]
        : []));
    const targets = [...discord_1.client.guilds.cache.values()];
    if (targets.length === 0) {
        await interaction.editReply("Bot tidak sedang terhubung ke guild mana pun.");
        return;
    }
    const results = await Promise.allSettled(targets.map(async (guild) => {
        const channel = await resolveAdminMessageChannel(guild, statusChannels.get(guild.id));
        if (!channel) {
            throw new Error("No text channel is available with permission to send messages");
        }
        await channel.send(content);
        return guild.id;
    }));
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            logger_1.default.warn(targets[index].id, `Could not send admin message: ${result.reason?.message ?? result.reason}`);
        }
    });
    if (failed === 0) {
        await interaction.editReply(`✅ Pesan admin dikirim ke semua ${sent} guild.`);
        return;
    }
    await interaction.editReply(`⚠️ Broadcast selesai: ${sent} dari ${targets.length} guild berhasil; ${failed} guild gagal menerima pesan.`);
}
