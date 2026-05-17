import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputApplicationCommandData } from "discord.js";
import range from "lodash/range";
import hash from "object-hash";
import { SLASH_COMMAND } from "../../constants";
import { client } from "../../discord";
import { slashCommandHashRepo } from "../../persistence";
import logger from "../../services/logger";

/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 4;

export async function initCommands() {
    const command = getSlashCommand();
    const commandHash = hash({ version: SLASH_COMMAND_REGISTRATION_VERSION, command });
    const existingHash = await slashCommandHashRepo.get();

    if (existingHash === commandHash) {
        logger.info(undefined, `No need to update slash command`);
        return;
    }

    logger.info(undefined, `Updating slash command for ${client.guilds.cache.size} guild(s)`);
    await clearGlobalCommands(command.name);
    await syncAllGuildCommands();
    await slashCommandHashRepo.set(commandHash);
}

/** Guild-scoped commands appear instantly on new servers (global commands can take up to an hour). */
export async function registerGuildCommands(guildId: string) {
    const command = getSlashCommand();
    await client.application!.commands.set([command], guildId);
    logger.info(guildId, `Registered slash command for guild`);
}

async function clearGlobalCommands(currentCommandName: string) {
    const applicationCommands = client.application!.commands;
    const globalCommands = await applicationCommands.fetch();

    for (const [, cmd] of globalCommands) {
        if (cmd.name !== currentCommandName) {
            logger.info(undefined, `Deleting stale global slash command: ${cmd.name}`);
        } else {
            logger.info(undefined, `Removing global slash command (using guild-scoped commands)`);
        }
        await applicationCommands.delete(cmd.id);
    }
}

async function syncAllGuildCommands() {
    const command = getSlashCommand();
    await Promise.all(client.guilds.cache.map((guild) => client.application!.commands.set([command], guild.id)));
}

export function getSlashCommand() {
    return {
        name: SLASH_COMMAND.name,
        ...command,
    };
}

const command: Omit<ChatInputApplicationCommandData, "name"> = {
    type: ApplicationCommandType.ChatInput,
    description: "Timer",
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: SLASH_COMMAND.commands.start,
            description: "Start the timer",
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: SLASH_COMMAND.commands.stop,
            description: "Stop the timer",
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: SLASH_COMMAND.commands.help,
            description: "Help",
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: SLASH_COMMAND.commands.skip.name,
            description: "Skip the current weather",
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: SLASH_COMMAND.commands.reset.name,
            description: "Stops the timer and resets all configuration",
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: SLASH_COMMAND.commands.athletes.name,
            description: "Get or set weathers",
            options: range(1, SLASH_COMMAND.commands.athletes.athletesCount + 1).flatMap((i) => [
                {
                    type: ApplicationCommandOptionType.String,
                    name: `${SLASH_COMMAND.commands.athletes.athletesPrefix}${i}`,
                    description: `Weather ${i}`,
                    required: false,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: `${SLASH_COMMAND.commands.athletes.timePrefix}${i}`,
                    description: `Time in seconds for weather ${i}`,
                    required: false,
                },
            ]),
        },
    ],
};
