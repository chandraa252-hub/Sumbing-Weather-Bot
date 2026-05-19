import { getVoiceConnection } from "@discordjs/voice";
import { type Scope } from "@sentry/node";
import { ChatInputCommandInteraction } from "discord.js";
import { environment } from "../../environment";
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

    const connection = getVoiceConnection(guildId, environment.botId);
    if (connection !== undefined) {
        logger.info(guildId, `Disconnecting from VC:${connection.joinConfig.channelId}`);
        connection.disconnect();
        connection.destroy();
    }

    const botVoice = guild.members.me?.voice;
    if (botVoice?.channelId) {
        try { await botVoice.disconnect(); } catch (e) {
            logger.warn(guildId, `Gateway voice disconnect failed: ${e}`);
        }
    }

    await interaction.editReply("Timer stopped");
}
