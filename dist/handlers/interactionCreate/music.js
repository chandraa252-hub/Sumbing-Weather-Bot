"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.music = music;
const voice_1 = require("@discordjs/voice");
const environment_1 = require("../../environment");
const connectToChannel_1 = require("../../util/connectToChannel");
const musicQueue_1 = require("../../services/musicQueue");
const logger_1 = require("../../services/logger");

async function music(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case "play":   return musicPlay(interaction);
        case "stop":   return musicStop(interaction);
        case "skip":   return musicSkip(interaction);
    }
}

async function musicPlay(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const url = interaction.options.getString("url", true);
    const log = logger_1.default ?? logger_1;

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    let channelId = member?.voice?.channelId ?? null;

    if (!channelId) {
        const existingConn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
        channelId = existingConn?.joinConfig?.channelId ?? null;
    }

    if (!channelId) {
        await interaction.editReply("❌ Kamu harus berada di voice channel terlebih dahulu, atau bot harus sudah ada di voice channel.");
        return;
    }

    const existingConn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
    if (!existingConn) {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            await (0, connectToChannel_1.connectToChannel)(channel).catch(() => null);
        }
    }

    await interaction.editReply("⏳ Mengambil info video, mohon tunggu...");

    let title = url;
    try {
        title = await (0, musicQueue_1.getYtDlpTitle)(url);
    } catch {
        title = url;
    }

    const wasActive = (0, musicQueue_1.isMusicActive)(guildId);
    (0, musicQueue_1.addToQueue)(guildId, { url, title }, channelId, interaction.channelId);
    const info = (0, musicQueue_1.getMusicInfo)(guildId);

    log.info(guildId, `MusicQueue: added "${title}" by ${interaction.user.id}`);

    if (wasActive) {
        await interaction.editReply(`✅ Ditambahkan ke antrian (#${info?.total ?? 1}): **${title}**`);
    } else {
        await interaction.editReply(`🎵 Memutar: **${title}**`);
    }
}

async function musicStop(interaction) {
    const guildId = interaction.guild.id;
    const log = logger_1.default ?? logger_1;
    const stopped = (0, musicQueue_1.stopMusicQueue)(guildId);
    if (stopped) {
        log.info(guildId, `MusicQueue: stopped by ${interaction.user.id}`);
        await interaction.editReply("⏹ Musik dihentikan dan antrian dibersihkan.");
    } else {
        await interaction.editReply("ℹ️ Tidak ada musik yang sedang diputar.");
    }
}

async function musicSkip(interaction) {
    const guildId = interaction.guild.id;
    const log = logger_1.default ?? logger_1;
    const skipped = (0, musicQueue_1.skipCurrentSong)(guildId);
    if (skipped) {
        log.info(guildId, `MusicQueue: skipped by ${interaction.user.id}`);
        await interaction.editReply("⏭ Lagu dilewati, memutar lagu berikutnya...");
    } else {
        await interaction.editReply("ℹ️ Tidak ada musik yang sedang diputar.");
    }
}
