import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { SLASH_COMMAND } from "../../constants";
import { configRepo } from "../../persistence";

export async function createHelpEmbed(guildId: string): Promise<EmbedBuilder> {
    const S = SLASH_COMMAND.commands;
    const config = await configRepo.get(guildId);
    const isID = config.languageKey === "id";

    return new EmbedBuilder()
        .setTitle(isID ? "Bantuan" : "Help")
        .setDescription(
            isID
                ? [
                    `**🌦️ Timer Cuaca**`,
                    `**/${S.weather} start** — Nyalakan timer global untuk server ini. Masuk voice channel terlebih dahulu.`,
                    `**/${S.weather} stop** — Matikan timer untuk server ini. Pesan status tetap tersedia untuk dinyalakan kembali.`,
                    ``,
                    `**🔧 Lainnya**`,
                    `**/${S.join}** — Masuk ke voice channel dan tetap berada di sana 24/7.`,
                    `**/${S.soundboard}** — Buka panel soundboard untuk memutar audio.`,
                    `**/${S.leave}** — Paksa bot keluar dari voice channel.`,
                    `**/${S.language}** — Atur bahasa pengumuman timer.`,
                    `**/${S.help}** — Tampilkan pesan bantuan ini.`,
                    ``,
                    `Jika timer tidak sinkron, hubungi <@762372166733529088> atau buka <https://discord.com/users/762372166733529088>.`,
                ].join("\n")
                : [
                    `**🌦️ Weather Timer**`,
                    `**/${S.weather} start** — Turn on the global timer for this server. Join a voice channel first.`,
                    `**/${S.weather} stop** — Turn off the timer for this server. The status message stays available to turn it back on.`,
                    ``,
                    `**🔧 Other**`,
                    `**/${S.join}** — Join your voice channel and stay there 24/7.`,
                    `**/${S.soundboard}** — Open the soundboard panel to play audio.`,
                    `**/${S.leave}** — Force disconnect bot from voice channel.`,
                    `**/${S.language}** — Set the announcement language.`,
                    `**/${S.help}** — Show this help message.`,
                    ``,
                    `If the timer is out of sync, contact <@762372166733529088> or visit <https://discord.com/users/762372166733529088>.`,
                ].join("\n")
        )
        .addFields(
            isID
                ? [
                    { name: "Server Discord (Pertanyaan/Masukan)", value: "<https://discord.gg/jB3J3xfmGf>" },
                    { name: "Dokumentasi Lengkap", value: "<https://github.com/chandraa252-hub/Sumbing-Weather-Timer>" },
                    { name: "Aplikasi Web", value: "<https://github.com/chandraa252-hub>" },
                    { name: "Dukung Proyek Ini", value: "<https://sociabuzz.com/chandraa252>" },
                ]
                : [
                    { name: "Discord Server (Questions/Feedback)", value: "<https://discord.gg/jB3J3xfmGf>" },
                    { name: "Full Documentation", value: "<https://github.com/chandraa252-hub/Sumbing-Weather-Timer>" },
                    { name: "Web App", value: "<https://github.com/chandraa252-hub>" },
                    { name: "Support this project", value: "<https://sociabuzz.com/chandraa252>" },
                ]
        )
        .setFooter({ text: isID ? "Dibuat oleh UNIX_STEVE" : "Made by UNIX_STEVE" });

}

export async function help(interaction: ChatInputCommandInteraction) {
    await interaction.editReply({ embeds: [await createHelpEmbed(interaction.guildId!)] });
}
