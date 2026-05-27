import { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { sleepcallRepo } from "../../persistence";
import { connectToChannel } from "../../util/connectToChannel";
import { startSleepcall, stopSleepcall, isSleepcallActive } from "../../services/sleepcall";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";

export async function sleepcall(interaction: ChatInputCommandInteraction, _scope: HandlerProps<any>["scope"]) {
    const guild = interaction.guild!;
    const guildId = guild.id;

    const action = interaction.options.getString("action") ?? "start";

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

    const member = await guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        await interaction.editReply("❌ Kamu harus berada di voice channel terlebih dahulu.");
        return;
    }

    const urlOption = interaction.options.getString("url");

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

    await sleepcallRepo.set({ guildId, channelId: voiceChannel.id, youtubeUrl });

    const conn = await connectToChannel(voiceChannel as any);
    if (!conn) {
        await interaction.editReply("❌ Tidak bisa bergabung ke voice channel.");
        return;
    }

    startSleepcall(guildId, voiceChannel.id, youtubeUrl, guild);

    logger.info(guildId, `Sleepcall started in VC:${voiceChannel.id} url:${youtubeUrl}`);

    const embed = new EmbedBuilder()
        .setTitle("😴 Sleepcall Mode Aktif")
        .setDescription(
            [
                `Bot akan tetap di **${voiceChannel.name}** selama 24/7.`,
                `🎵 Memutar live music dari YouTube.`,
                ``,
                `Link: ${youtubeUrl}`,
                ``,
                `Gunakan \`/sleepcall action:stop\` atau \`/leave\` untuk menghentikan.`,
            ].join("\n")
        )
        .setColor(0x5865f2);

    await interaction.editReply({ embeds: [embed] });
}
