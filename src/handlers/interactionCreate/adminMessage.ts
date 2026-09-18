import type { Scope } from "@sentry/node";
import {
    ChannelType,
    type ChatInputCommandInteraction,
    type Guild,
    type GuildBasedChannel,
    PermissionFlagsBits,
} from "discord.js";
import { client } from "../../discord";
import { timerRepo } from "../../persistence";
import { isGlobalAdmin } from "../../services/globalTimer";
import logger from "../../services/logger";

function canSendToChannel(guild: Guild, channel: GuildBasedChannel): channel is GuildBasedChannel & {
    send: (content: string) => Promise<unknown>;
} {
    if (!channel.isSendable() || channel.isThread()) {
        return false;
    }

    const botMember = guild.members.me;
    const permissions = botMember ? channel.permissionsFor(botMember) : null;
    return permissions?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
    ]) ?? false;
}

async function resolveAdminMessageChannel(guild: Guild, statusChannelId?: string) {
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
        .filter((channel): channel is GuildBasedChannel => channel !== null)
        .filter((channel) =>
            channel.type === ChannelType.GuildText &&
            canSendToChannel(guild, channel)
        )
        .sort((first, second) => first.rawPosition - second.rawPosition)
        .first();
}

export async function adminMessage(interaction: ChatInputCommandInteraction, _scope: Scope): Promise<void> {
    if (!isGlobalAdmin(interaction.user.id)) {
        await interaction.editReply("⛔ Anda tidak memiliki izin untuk mengirim pesan admin.");
        return;
    }

    const content = interaction.options.getString("message", true);
    const timers = await timerRepo.getAll();
    const statusChannels = new Map(
        timers.flatMap((timer) =>
            timer?.status?.channelId
                ? [[timer.guildId, timer.status.channelId] as const]
                : []
        )
    );
    const targets = [...client.guilds.cache.values()];

    if (targets.length === 0) {
        await interaction.editReply("Bot tidak sedang terhubung ke guild mana pun.");
        return;
    }

    const results = await Promise.allSettled(
        targets.map(async (guild) => {
            const channel = await resolveAdminMessageChannel(
                guild,
                statusChannels.get(guild.id)
            );
            if (!channel) {
                throw new Error("No text channel is available with permission to send messages");
            }

            await channel.send(content);
            return guild.id;
        })
    );

    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            logger.warn(targets[index].id, `Could not send admin message: ${result.reason?.message ?? result.reason}`);
        }
    });

    if (failed === 0) {
        await interaction.editReply(`✅ Pesan admin dikirim ke semua ${sent} guild.`);
        return;
    }

    await interaction.editReply(
        `⚠️ Broadcast selesai: ${sent} dari ${targets.length} guild berhasil; ${failed} guild gagal menerima pesan.`
    );
}