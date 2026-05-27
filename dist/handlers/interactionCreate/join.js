"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = join;
const discord_js_1 = require("discord.js");
const constants_1 = require("../../constants");
const persistence_1 = require("../../persistence");
const connectToChannel_1 = require("../../util/connectToChannel");
const logger_1 = require("../../services/logger");
async function join(interaction, _scope) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const member = await guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
        const config = await persistence_1.configRepo.get(guildId);
        const isID = config.languageKey === "id";
        await interaction.editReply(isID
            ? "❌ Kamu harus berada di voice channel terlebih dahulu."
            : "❌ You need to be in a voice channel first.");
        return;
    }
    const connection = await (0, connectToChannel_1.connectToChannel)(voiceChannel);
    if (!connection) {
        const config = await persistence_1.configRepo.get(guildId);
        const isID = config.languageKey === "id";
        await interaction.editReply(isID
            ? "❌ Tidak bisa bergabung ke voice channel."
            : "❌ Cannot join your voice channel.");
        return;
    }
    const config = await persistence_1.configRepo.get(guildId);
    const isID = config.languageKey === "id";
    logger_1.default.info(guildId, `Joined VC via /join: ${voiceChannel.id}`);
    const description = isID
        ? [
            "Selamat datang di **Sumbing Weather Timer**.",
            "",
            "Gunakan `/start` untuk memulai weather timer",
            "dan `/help` untuk melihat semua command yang tersedia.",
            "",
            "Soundboard juga tersedia untuk dimainkan.",
        ].join("\n")
        : [
            "Welcome to **Sumbing Weather Timer**.",
            "",
            "Use `/start` to begin the weather timer",
            "and `/help` to view all available commands.",
            "",
            "A soundboard is also available for you to play with.",
        ].join("\n");
    const embed = new discord_js_1.EmbedBuilder().setDescription(description);
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(constants_1.BUTTON_SOUNDBOARD_OPEN)
        .setLabel("🎵 Soundboard")
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await interaction.editReply({ embeds: [embed], components: [row] });
}
