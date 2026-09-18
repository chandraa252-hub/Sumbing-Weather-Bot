import { type Scope } from "@sentry/node";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, VoiceChannel } from "discord.js";
import { BUTTON_SOUNDBOARD_OPEN } from "../../constants";
import { configRepo } from "../../persistence";
import { connectToChannel } from "../../util/connectToChannel";
import logger from "../../services/logger";

export async function join(interaction: ChatInputCommandInteraction, _scope: Scope): Promise<void> {
    const guild = interaction.guild!;
    const guildId = guild.id;
    const member = await guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel as VoiceChannel | null;

    if (!voiceChannel) {
        const config = await configRepo.get(guildId);
        const isID = config.languageKey === "id";
        await interaction.editReply(
            isID
                ? "❌ Kamu harus berada di voice channel terlebih dahulu."
                : "❌ You need to be in a voice channel first."
        );
        return;
    }

    const connection = await connectToChannel(voiceChannel);
    if (!connection) {
        const config = await configRepo.get(guildId);
        const isID = config.languageKey === "id";
        await interaction.editReply(
            isID
                ? "❌ Tidak bisa bergabung ke voice channel."
                : "❌ Cannot join your voice channel."
        );
        return;
    }

    const config = await configRepo.get(guildId);
    const isID = config.languageKey === "id";

    logger.info(guildId, `Joined VC via /join: ${voiceChannel.id}`);

    const description = isID
        ? [
            "Selamat datang di **Sumbing Weather Timer**.",
            "",
                    `Gunakan \`/weather start\` untuk memulai weather timer`,
                    `dan \`/help\` untuk melihat semua command yang tersedia.`,
            "",
                    "Bot akan tetap berada di voice channel sampai diperintahkan `/leave`.",
        ].join("\n")
        : [
            "Welcome to **Sumbing Weather Timer**.",
            "",
                    `Use \`/weather start\` to begin the weather timer`,
            `and \`/help\` to view all available commands.`,
            "",
                    "The bot will stay in the voice channel until `/leave` is used.",
        ].join("\n");

    const embed = new EmbedBuilder().setDescription(description);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_SOUNDBOARD_OPEN)
            .setLabel("🎵 Soundboard")
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
}
