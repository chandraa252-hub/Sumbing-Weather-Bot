"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.help = help;
const discord_js_1 = require("discord.js");
const constants_1 = require("../../constants");
const persistence_1 = require("../../persistence");
async function help(interaction) {
    const S = constants_1.SLASH_COMMAND.commands;
    const guildId = interaction.guildId;
    const config = await persistence_1.configRepo.get(guildId);
    const isID = config.languageKey === "id";
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(isID ? "Bantuan" : "Help")
        .setDescription(isID
        ? [
            `**🌦️ Timer Cuaca**`,
            `**/${S.weather} start** — Mulai timer cuaca. Masuk voice channel terlebih dahulu.`,
            `**/${S.weather} stop** — Hentikan timer (bot tetap di channel).`,
            `**/${S.weather} skip** — Lewati ke cuaca berikutnya dalam rotasi.`,
            `**/${S.weather} reset** — Hentikan timer dan reset semua konfigurasi server.`,
            `**/${S.weather} status** — Tampilkan status timer saat ini.`,
            `**/${S.athletes.name}** — Lihat atau atur nama cuaca dan durasi rotasi.`,
            ``,
            `**🎵 Musik**`,
            `**/${S.music} play url:** — Tambahkan URL YouTube ke antrian dan mulai putar.`,
            `**/${S.music} skip** — Lewati lagu saat ini ke lagu berikutnya dalam antrian.`,
            `**/${S.music} stop** — Hentikan musik dan bersihkan antrian.`,
            `**/${S.sleepcall}** — Bot tetap di VC 24/7 sambil memutar live music YouTube.`,
            ``,
            `**🔧 Lainnya**`,
            `**/${S.join}** — Masuk ke voice channel dan tampilkan soundboard.`,
            `**/${S.soundboard}** — Buka panel soundboard untuk memutar audio.`,
            `**/${S.leave}** — Paksa bot keluar dari voice channel.`,
            `**/${S.language}** — Atur bahasa pengumuman timer.`,
            `**/${S.help}** — Tampilkan pesan bantuan ini.`,
        ].join("\n")
        : [
            `**🌦️ Weather Timer**`,
            `**/${S.weather} start** — Start the weather timer. Join a voice channel first.`,
            `**/${S.weather} stop** — Stop the timer (bot stays in channel).`,
            `**/${S.weather} skip** — Skip to the next weather in the rotation.`,
            `**/${S.weather} reset** — Stop the timer and reset all server configuration.`,
            `**/${S.weather} status** — Show current timer status.`,
            `**/${S.athletes.name}** — View or set weather names and rotation durations.`,
            ``,
            `**🎵 Music**`,
            `**/${S.music} play url:** — Add a YouTube URL to the queue and start playing.`,
            `**/${S.music} skip** — Skip the current song to the next in queue.`,
            `**/${S.music} stop** — Stop music and clear the queue.`,
            `**/${S.sleepcall}** — Keep bot in VC 24/7 while playing YouTube live music.`,
            ``,
            `**🔧 Other**`,
            `**/${S.join}** — Join your voice channel and show the soundboard.`,
            `**/${S.soundboard}** — Open the soundboard panel to play audio.`,
            `**/${S.leave}** — Force disconnect bot from voice channel.`,
            `**/${S.language}** — Set the announcement language.`,
            `**/${S.help}** — Show this help message.`,
        ].join("\n"))
        .addFields(isID
        ? [
            { name: "Server Discord (Pertanyaan/Masukan)", value: "<https://discord.gg/jB3J3xfmGf>" },
            { name: "Dokumentasi Lengkap", value: "<https://github.com/chandraa252-hub/Sumbing-Weather-Timer>" },
            { name: "Aplikasi Web", value: "<https://github.com/chandraa252-hub>" },
            { name: "Dukung Proyek Ini", value: "<https://discord.com/users/762372166733529088>" },
        ]
        : [
            { name: "Discord Server (Questions/Feedback)", value: "<https://discord.gg/jB3J3xfmGf>" },
            { name: "Full Documentation", value: "<https://github.com/chandraa252-hub/Sumbing-Weather-Timer>" },
            { name: "Web App", value: "<https://github.com/chandraa252-hub>" },
            { name: "Support this project", value: "<https://discord.com/users/762372166733529088>" },
        ])
        .setFooter({ text: isID ? "Dibuat oleh Stephanus Chandra Wijaya" : "Made by Stephanus Chandra Wijaya" });
    await interaction.editReply({ embeds: [embed] });
}
