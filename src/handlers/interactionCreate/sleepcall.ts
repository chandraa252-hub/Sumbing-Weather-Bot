import { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { configRepo, sleepcallRepo } from "../../persistence";
import { connectToChannel } from "../../util/connectToChannel";
import { startSleepcall } from "../../services/sleepcall";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";

export async function sleepcall(interaction: ChatInputCommandInteraction, _scope: HandlerProps<any>["scope"]) {
    const guild = interaction.guild!;
    const guildId = guild.id;

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
                `Gunakan \`/leave\` untuk mengeluarkan bot.`,
            ].join("\n")
        )
        .setColor(0x5865f2);

    await interaction.editReply({ embeds: [embed] });
}
