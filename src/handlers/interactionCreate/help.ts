import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { SLASH_COMMAND } from "../../constants";

export async function help(interaction: ChatInputCommandInteraction) {
    const cmd = SLASH_COMMAND.name;

    const embed = new EmbedBuilder()
        .setTitle("Help")
        .setDescription(
            [
                `**/${cmd} start** — Start the weather timer. Join a voice channel first.`,
                `**/${cmd} stop** — Stop the timer and disconnect from voice.`,
                `**/${cmd} weathers** — View or set weather names and rotation durations.`,
                `**/${cmd} help** — Show this help message.`,
                `**/${cmd} reset** — Stop the timer and reset all server configuration.`,
                `**/${cmd} skip** — Skip to the next weather in the rotation.`,
            ].join("\n")
        )
        .addFields([
            {
                name: "Discord Server (Questions/Feedback)",
                value: "<https://discord.gg/jB3J3xfmGf>",
            },
            {
                name: "Full Documentation",
                value: "<https://github.com/chandraa252-hub/Sumbing-Weather-Timer>",
            },
            {
                name: "Web App",
                value: "<https://github.com/chandraa252-hub>",
            },
            {
                name: "Support this project",
                value: "<https://discord.com/users/762372166733529088>",
            },
        ])
        .setFooter({ text: "Made by Stephanus Chandra Wijaya" });

    await interaction.editReply({ embeds: [embed] });
}
