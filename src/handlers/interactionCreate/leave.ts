import { getVoiceConnection } from "@discordjs/voice";
import { type Scope } from "@sentry/node";
import { ChatInputCommandInteraction } from "discord.js";
import { environment } from "../../environment";
import { configRepo, timerRepo } from "../../persistence";
import logger from "../../services/logger";
import { stopTimer } from "../../services/timer";

export async function leave(interaction: ChatInputCommandInteraction, scope: Scope): Promise<void> {
    const guild = interaction.guild!;
    const guildId = guild.id;
    const config = await configRepo.get(guildId);
    const isID = config.languageKey === "id";

    const timerRunning = await timerRepo.exists(guildId);
    if (timerRunning) {
        await stopTimer(guildId, scope);
        logger.info(guildId, "Timer stopped by /leave");
    }

    let disconnected = false;

    const conn = getVoiceConnection(guildId, environment.botId);
    if (conn) {
        logger.info(guildId, `Leave: disconnecting VoiceConnection from VC:${conn.joinConfig.channelId}`);
        conn.disconnect();
        conn.destroy();
        disconnected = true;
    }

    const botVoice = guild.members.me?.voice;
    if (botVoice?.channelId) {
        try {
            await botVoice.disconnect();
            logger.info(guildId, "Leave: Gateway voice disconnect successful");
            disconnected = true;
        } catch (e) {
            logger.warn(guildId, `Leave: Gateway voice disconnect failed: ${e}`);
        }
    }

    await interaction.editReply(
        disconnected
            ? (isID ? "Bot telah keluar dari voice channel." : "Bot has left the voice channel.")
            : (isID ? "Bot tidak sedang di voice channel." : "Bot is not in a voice channel.")
    );
}
