import { Interaction } from "discord.js";
import { SLASH_COMMAND } from "../../constants";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";
import { getVoiceConnection } from "@discordjs/voice";
import { environment } from "../../environment";
import { BUTTON_SKIP, BUTTON_STOP, updateStatusMessage } from "../../services/statusMessage";
import { skipCurrentAthlete, stopTimer } from "../../services/timer";
import { timerRepo } from "../../persistence";
import { reset } from "./reset";
import { athletes } from "./athletes";
import { help } from "./help";
import { skip } from "./skip";
import { start } from "./start";
import { stop } from "./stop";

const commandsMap = {
    [SLASH_COMMAND.commands.help]: help,
    [SLASH_COMMAND.commands.start]: start,
    [SLASH_COMMAND.commands.stop]: stop,
    [SLASH_COMMAND.commands.athletes.name]: athletes,
    [SLASH_COMMAND.commands.skip.name]: skip,
    [SLASH_COMMAND.commands.reset.name]: reset,
};

export async function handleInteractionCreate({ args: [interaction], scope }: HandlerProps<[Interaction]>) {
    if (interaction.isButton() && interaction.inGuild()) {
        await interaction.deferUpdate();
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        logger.info(guildId, `Button: ${interaction.customId} by ${userId}`);

        const timer = await timerRepo.get(guildId);
        if (!timer) return;

        if (
            timer.status?.channelId !== interaction.channelId ||
            timer.status?.messageId !== interaction.message.id
        ) {
            return;
        }

        switch (interaction.customId) {
            case BUTTON_SKIP:
                await skipCurrentAthlete(guildId);
                await updateStatusMessage(guildId, scope);
                break;

            case BUTTON_STOP: {
                await stopTimer(guildId, scope);
                const conn = getVoiceConnection(guildId, environment.botId);
                if (conn) {
                    logger.info(guildId, `Disconnecting from VC:${conn.joinConfig.channelId}`);
                    conn.disconnect();
                    conn.destroy();
                }
                break;
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand() || !interaction.inGuild()) {
        return;
    }
    const guildId = interaction.guildId;

    const commandName = interaction.options.getSubcommand();
    logger.info(guildId, `Slash Command: ${commandName}`);

    await interaction.deferReply();

    const command = commandsMap[commandName];
    if (command) {
        await command(interaction, scope);
    } else {
        await interaction.editReply("Unsupported command");
    }
}
