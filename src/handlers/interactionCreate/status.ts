import { ChatInputCommandInteraction } from "discord.js";
import { configRepo, timerRepo } from "../../persistence";
import { createStatusMessage } from "../../services/statusMessage";

export async function status(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const [config, timer] = await Promise.all([
        configRepo.get(guildId),
        timerRepo.get(guildId),
    ]);

    if (!timer) {
        const msg = config.languageKey === "id"
            ? "Tidak ada timer yang aktif saat ini."
            : "No active timer at the moment.";
        await interaction.editReply(msg);
        return;
    }

    await interaction.editReply({ embeds: [createStatusMessage(config, timer)] });
}
