import type { ChatInputCommandInteraction } from "discord.js";
import { GuildMember } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { environment } from "../../environment";
import { connectToChannel } from "../../util/connectToChannel";
import {
    addToQueue,
    getYtDlpTitle,
    skipCurrentSong,
    stopMusicQueue,
    isMusicActive,
    getMusicInfo,
} from "../../services/musicQueue";
import logger from "../../services/logger";

export async function music(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case "play":   return musicPlay(interaction);
        case "stop":   return musicStop(interaction);
        case "skip":   return musicSkip(interaction);
    }
}

async function musicPlay(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild!;
    const guildId = guild.id;
    const url = interaction.options.getString("url", true);

    const member = await guild.members.fetch(interaction.user.id).catch(() => null) as GuildMember | null;
    let channelId: string | null = member?.voice?.channelId ?? null;

    if (!channelId) {
        const existingConn = getVoiceConnection(guildId, environment.botId as any);
        channelId = existingConn?.joinConfig?.channelId ?? null;
    }

    if (!channelId) {
        await interaction.editReply("❌ Kamu harus berada di voice channel terlebih dahulu, atau bot harus sudah ada di voice channel.");
        return;
    }

    const existingConn = getVoiceConnection(guildId, environment.botId as any);
    if (!existingConn) {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            await connectToChannel(channel as any).catch(() => null);
        }
    }

    await interaction.editReply("⏳ Mengambil info video, mohon tunggu...");

    let title = url;
    try {
        title = await getYtDlpTitle(url);
    } catch {
        title = url;
    }

    const wasActive = isMusicActive(guildId);
    addToQueue(guildId, { url, title }, channelId, interaction.channelId);
    const info = getMusicInfo(guildId);

    logger.info(guildId, `MusicQueue: added "${title}" by ${interaction.user.id}`);

    if (wasActive) {
        await interaction.editReply(`✅ Ditambahkan ke antrian (#${info?.total ?? 1}): **${title}**`);
    } else {
        await interaction.editReply(`🎵 Memutar: **${title}**`);
    }
}

async function musicStop(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild!.id;
    const stopped = stopMusicQueue(guildId);
    if (stopped) {
        logger.info(guildId, `MusicQueue: stopped by ${interaction.user.id}`);
        await interaction.editReply("⏹ Musik dihentikan dan antrian dibersihkan.");
    } else {
        await interaction.editReply("ℹ️ Tidak ada musik yang sedang diputar.");
    }
}

async function musicSkip(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild!.id;
    const skipped = skipCurrentSong(guildId);
    if (skipped) {
        logger.info(guildId, `MusicQueue: skipped by ${interaction.user.id}`);
        await interaction.editReply("⏭ Lagu dilewati, memutar lagu berikutnya...");
    } else {
        await interaction.editReply("ℹ️ Tidak ada musik yang sedang diputar.");
    }
}
