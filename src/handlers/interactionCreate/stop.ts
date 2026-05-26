import { type Scope } from "@sentry/node";
import { ChatInputCommandInteraction } from "discord.js";
import { timerRepo } from "../../persistence";
import logger from "../../services/logger";
import { stopTimer } from "../../services/timer";

export async function stop(interaction: ChatInputCommandInteraction, scope: Scope): Promise<void> {
    const guild = interaction.guild!;
    const guildId = guild.id;

    if (!(await timerRepo.exists(guildId))) {
        logger.info(guildId, "Timer is not running");
        await interaction.editReply("Timer is not running");
        return;
    }

    logger.info(guildId, "Stopping timer");
    await stopTimer(guildId, scope);

    await interaction.editReply("Timer stopped");
}
