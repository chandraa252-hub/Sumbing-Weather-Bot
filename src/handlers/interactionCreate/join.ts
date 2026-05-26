import { type Scope } from "@sentry/node";
import { ChatInputCommandInteraction, EmbedBuilder, Guild, GuildMember, TextChannel } from "discord.js";
import { SLASH_COMMAND, BUTTON_SOUNDBOARD_OPEN } from "../../constants";
import { configRepo } from "../../persistence";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import logger from "../../services/logger";
import { hasVoicePermissions } from "../../services/permissions";
import { getVoiceConnection } from "../../util/getVoiceConnection";

async function resolveGuildMember(guild: Guild, interaction: ChatInputCommandInteraction): Promise<GuildMember | null> {
    const member = interaction.member;
    if (member instanceof GuildMember) {
        return member;
    }

    try {
        return await guild.members.fetch(interaction.user.id);
    } catch {
        return null;
    }
}

export async function join(interaction: ChatInputCommandInteraction, _scope: Scope) {
    const guild = interaction.guild!;
    const guildId = guild.id;
    const config = await configRepo.get(guildId);

    if (!hasVoicePermissions(guild)) {
        await interaction.editReply("I don't have enough permissions to join the voice channel.");
        return;
    }

    const member = await resolveGuildMember(guild, interaction);
    if (!member?.voice.channel) {
        const errorMsg = config.languageKey === "id"
            ? "Kamu harus berada di voice channel terlebih dahulu."
            : "You must be in a voice channel first.";
        await interaction.editReply(errorMsg);
        return;
    }

    const isEnglish = config.languageKey === "id" ? false : true;
    const title = isEnglish ? "Welcome to Sumbing Weather Timer." : "Selamat datang di Sumbing Weather Timer.";
    const description = isEnglish
        ? "Use /start to begin the weather timer\nand /help to view all available commands.\n\nA soundboard is also available for you to play with."
        : "Gunakan /start untuk memulai weather timer\ndan /help untuk melihat semua command yang tersedia.\n\nSoundboard juga tersedia untuk dimainkan.";

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x2ecc71);

    const soundboardButton = new ButtonBuilder()
        .setCustomId(BUTTON_SOUNDBOARD_OPEN)
        .setLabel(isEnglish ? "🎵 Soundboard" : "🎵 Soundboard")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(soundboardButton);

    // Join voice channel
    await getVoiceConnection(config, member, guild);

    const replyMsg = await interaction.editReply({
        embeds: [embed],
        components: [row],
    });

    logger.info(guildId, `User joined voice channel: ${member.voice.channelId}`);
}
