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
    const textChannelId = interaction.channelId;
    const log = logger_1.default ?? logger_1;

    const action = interaction.options.getString("action") ?? "start";
    const urlOption = interaction.options.getString("url");

    if (action === "stop") {
        if (!(0, sleepcall_1.isSleepcallActive)(guildId)) {
            await interaction.editReply("ℹ️ Tidak ada sleepcall yang sedang aktif di server ini.");
            return;
        }
        (0, sleepcall_1.stopSleepcall)(guildId);
        await persistence_1.sleepcallRepo.remove(guildId);
        log.info(guildId, `Sleepcall stopped by ${interaction.user.id}`);
        await interaction.editReply("✅ Sleepcall dihentikan. Bot tetap di voice channel.");
        return;
    }

    if (action === "status") {
        const saved = await persistence_1.sleepcallRepo.get(guildId);
        if (!saved || !(0, sleepcall_1.isSleepcallActive)(guildId)) {
            await interaction.editReply("ℹ️ Tidak ada sleepcall yang sedang aktif di server ini.");
            return;
        }
        const elapsed = Date.now() - saved.startTime;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("📊 Status Sleepcall")
            .setDescription(
                [
                    `🔊 Voice berjalan selama: **${(0, sleepcall_1.formatDuration)(elapsed)}**`,
                    `🎵 Sedang memutar: **${saved.videoTitle || "—"}**`,
                    `🏆 Milestone berikutnya: ${(0, sleepcall_1.getNextMilestoneText)(saved.startTime)}`,
                ].join("\n")
            )
            .setColor(0x57f287);
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if ((0, sleepcall_1.isSleepcallActive)(guildId) && urlOption) {
        const saved = await persistence_1.sleepcallRepo.get(guildId);
        if (saved) {
            let videoTitle = urlOption;
            try {
                videoTitle = await (0, sleepcall_1.getYtDlpTitle)(urlOption);
            } catch {
                videoTitle = urlOption;
            }
            const updated = { ...saved, youtubeUrl: urlOption, videoTitle };
            await persistence_1.sleepcallRepo.set(updated);
            (0, sleepcall_1.startSleepcall)(guildId, saved.channelId, urlOption, guild, saved.textChannelId, saved.startTime);
            log.info(guildId, `Sleepcall URL updated to: ${urlOption}`);
            await interaction.editReply(`✅ URL sleepcall diperbarui!\n🎵 Sekarang memutar: **${videoTitle}**`);
            return;
        }
    }

    const member = await guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        await interaction.editReply("❌ Kamu harus berada di voice channel terlebih dahulu.");
        return;
    }

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

    await interaction.editReply("⏳ Mengambil info video, mohon tunggu...");

    let videoTitle = youtubeUrl;
    try {
        videoTitle = await (0, sleepcall_1.getYtDlpTitle)(youtubeUrl);
    } catch {
        videoTitle = youtubeUrl;
    }

    const startTime = Date.now();
    await persistence_1.sleepcallRepo.set({ guildId, channelId: voiceChannel.id, youtubeUrl, textChannelId, startTime, videoTitle });

    const conn = await (0, connectToChannel_1.connectToChannel)(voiceChannel);
    if (!conn) {
        await interaction.editReply("❌ Tidak bisa bergabung ke voice channel.");
        return;
    }

    (0, sleepcall_1.startSleepcall)(guildId, voiceChannel.id, youtubeUrl, guild, textChannelId, startTime);

    log.info(guildId, `Sleepcall started in VC:${voiceChannel.id} title:"${videoTitle}"`);

    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("😴 Sleepcall Mode Aktif")
        .setDescription(
            [
                `Bot akan tetap di **${voiceChannel.name}** selama 24/7.`,
                `🎵 Memutar: **${videoTitle}**`,
                ``,
                `Gunakan \`/sleepcall action:stop\` atau \`/leave\` untuk menghentikan.`,
            ].join("\n")
        )
        .setColor(0x5865f2);

    await interaction.editReply({ embeds: [embed] });
}
