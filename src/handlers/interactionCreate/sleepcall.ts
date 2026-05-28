import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { sleepcallRepo } from "../../persistence";
import { connectToChannel } from "../../util/connectToChannel";
import {
    startSleepcall,
    stopSleepcall,
    isSleepcallActive,
    getYtDlpTitle,
    formatDuration,
    getNextMilestoneText,
} from "../../services/sleepcall";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";

export async function sleepcall(interaction: ChatInputCommandInteraction, _scope: HandlerProps<any>["scope"]) {
    const guild = interaction.guild!;
    const guildId = guild.id;
    const textChannelId = interaction.channelId;

    const action = interaction.options.getString("action") ?? "start";
    const urlOption = interaction.options.getString("url");

    if (action === "stop") {
        if (!isSleepcallActive(guildId)) {
            await interaction.editReply("ℹ️ Tidak ada sleepcall yang sedang aktif di server ini.");
            return;
        }
        stopSleepcall(guildId);
        await sleepcallRepo.remove(guildId);
        logger.info(guildId, `Sleepcall stopped by ${interaction.user.id}`);
        await interaction.editReply("✅ Sleepcall dihentikan. Bot tetap di voice channel.");
        return;
    }

    if (action === "status") {
        const saved = await sleepcallRepo.get(guildId);
        if (!saved || !isSleepcallActive(guildId)) {
            await interaction.editReply("ℹ️ Tidak ada sleepcall yang sedang aktif di server ini.");
            return;
        }
        const elapsed = Date.now() - saved.startTime;
        const embed = new EmbedBuilder()
            .setTitle("📊 Status Sleepcall")
            .setDescription(
                [
                    `🔊 Voice berjalan selama: **${formatDuration(elapsed)}**`,
                    `🎵 Sedang memutar: **${saved.videoTitle || "—"}**`,
                    `🏆 Milestone berikutnya: ${getNextMilestoneText(saved.startTime)}`,
                ].join("\n")
            )
            .setColor(0x57f287);
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (isSleepcallActive(guildId) && urlOption) {
        const saved = await sleepcallRepo.get(guildId);
        if (saved) {
            let videoTitle = urlOption;
            try {
                videoTitle = await getYtDlpTitle(urlOption);
            } catch {
                videoTitle = urlOption;
            }
            const updated = { ...saved, youtubeUrl: urlOption, videoTitle };
            await sleepcallRepo.set(updated);
            startSleepcall(guildId, saved.channelId, urlOption, guild, saved.textChannelId, saved.startTime);
            logger.info(guildId, `Sleepcall URL updated to: ${urlOption}`);
            const elapsed = Date.now() - saved.startTime;
            await interaction.editReply(
                `✅ URL sleepcall diperbarui!\n🎵 Sekarang memutar: **${videoTitle}**\n🔊 Voice sudah berjalan: **${formatDuration(elapsed)}**`
            );
            return;
        }
    }

    const member = await guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        await interaction.editReply("❌ Kamu harus berada di voice channel terlebih dahulu.");
        return;
    }

    let youtubeUrl: string | null = urlOption;
    if (!youtubeUrl) {
        const saved = await sleepcallRepo.get(guildId);
        youtubeUrl = saved?.youtubeUrl ?? null;
    }

    if (!youtubeUrl) {
        await interaction.editReply(
            "❌ Belum ada link YouTube tersimpan.\nGunakan: `/sleepcall url:<link_youtube_live>`"
        );
        return;
    }

    await interaction.editReply("⏳ Mengambil info video, mohon tunggu...");

    let videoTitle = youtubeUrl;
    try {
        videoTitle = await getYtDlpTitle(youtubeUrl);
    } catch {
        videoTitle = youtubeUrl;
    }

    const startTime = Date.now();
    await sleepcallRepo.set({ guildId, channelId: voiceChannel.id, youtubeUrl, textChannelId, startTime, videoTitle });

    const conn = await connectToChannel(voiceChannel as any);
    if (!conn) {
        await interaction.editReply("❌ Tidak bisa bergabung ke voice channel.");
        return;
    }

    startSleepcall(guildId, voiceChannel.id, youtubeUrl, guild, textChannelId, startTime);

    logger.info(guildId, `Sleepcall started in VC:${voiceChannel.id} title:"${videoTitle}"`);

    const embed = new EmbedBuilder()
        .setTitle("😴 Sleepcall Mode Aktif")
        .setDescription(
            [
                `Bot akan tetap di **${voiceChannel.name}** selama 24/7.`,
                `**${voiceChannel.name}** sudah berjalan selama baru dimulai`,
                `🎵 Memutar music audio dari YouTube.`,
                ``,
                `Judul : **${videoTitle}**`,
                ``,
                `Gunakan \`/sleepcall action:stop\` atau \`/leave\` untuk mengeluarkan bot.`,
            ].join("\n")
        )
        .setColor(0x5865f2);

    await interaction.editReply({ embeds: [embed] });
}
