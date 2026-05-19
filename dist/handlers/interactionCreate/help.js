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
            `**/${S.start}** — Mulai timer cuaca. Masuk voice channel terlebih dahulu.`,
            `**/${S.stop}** — Hentikan timer dan keluar dari voice.`,
            `**/${S.athletes.name}** — Lihat atau atur nama cuaca dan durasi rotasi.`,
            `**/${S.help}** — Tampilkan pesan bantuan ini.`,
            `**/${S.reset.name}** — Hentikan timer dan reset semua konfigurasi server.`,
            `**/${S.skip.name}** — Lewati ke cuaca berikutnya dalam rotasi.`,
            `**/${S.language}** — Atur bahasa pengumuman timer.`,
        ].join("\n")
        : [
            `**/${S.start}** — Start the weather timer. Join a voice channel first.`,
            `**/${S.stop}** — Stop the timer and disconnect from voice.`,
            `**/${S.athletes.name}** — View or set weather names and rotation durations.`,
            `**/${S.help}** — Show this help message.`,
            `**/${S.reset.name}** — Stop the timer and reset all server configuration.`,
            `**/${S.skip.name}** — Skip to the next weather in the rotation.`,
            `**/${S.language}** — Set the announcement language.`,
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
