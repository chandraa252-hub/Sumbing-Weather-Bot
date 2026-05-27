"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleepcall = sleepcall;
const discord_js_1 = require("discord.js");
const persistence_1 = require("../../persistence");
const connectToChannel_1 = require("../../util/connectToChannel");
const sleepcall_1 = require("../../services/sleepcall");
const logger_1 = require("../../services/logger");

async function sleepcall(interaction, _scope) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const log = logger_1.default ?? logger_1;

    const member = await guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        await interaction.editReply("❌ Kamu harus berada di voice channel terlebih dahulu.");
        return;
    }

    const urlOption = interaction.options.getString("url");

    // Use provided URL or fallback to saved URL
    let youtubeUrl = urlOption ?? null;
    if (!youtubeUrl) {
        const saved = await persistence_1.sleepcallRepo.get(guildId);
        youtubeUrl = saved?.youtubeUrl ?? null;
    }

    if (!youtubeUrl) {
        await interaction.editReply(
            "❌ Belum ada link YouTube tersimpan.\nGunakan: `/sleepcall url:<link_youtube_live>`"
        );
        return;
    }

    // Save state to Redis
    await persistence_1.sleepcallRepo.set({ guildId, channelId: voiceChannel.id, youtubeUrl });

    // Connect to VC first
    const conn = await (0, connectToChannel_1.connectToChannel)(voiceChannel);
    if (!conn) {
        await interaction.editReply("❌ Tidak bisa bergabung ke voice channel.");
        return;
    }

    // Start sleepcall loop
    (0, sleepcall_1.startSleepcall)(guildId, voiceChannel.id, youtubeUrl, guild);

    log.info(guildId, `Sleepcall started in VC:${voiceChannel.id} url:${youtubeUrl}`);

    const embed = new discord_js_1.EmbedBuilder()
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
