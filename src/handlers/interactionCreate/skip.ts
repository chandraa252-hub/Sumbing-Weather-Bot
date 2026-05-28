import type { ChatInputCommandInteraction } from "discord.js";
import { timerRepo } from "../../persistence";
import { updateStatusMessage } from "../../services/statusMessage";
import { skipCurrentAthlete } from "../../services/timer";

export async function skip(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild!.id;

    if (!(await timerRepo.exists(guildId))) {
        await interaction.editReply("Mulai timer terlebih dahulu menggunakan `/weather start`");
        return;
    }

    await skipCurrentAthlete(guildId);

    await Promise.all([interaction.editReply("Weather skipped"), updateStatusMessage(guildId)]);
}
