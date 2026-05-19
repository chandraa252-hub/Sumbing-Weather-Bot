import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import range from "lodash/range";
import hash from "object-hash";
import { SLASH_COMMAND } from "../../constants";
import { client } from "../../discord";
import { slashCommandHashRepo } from "../../persistence";
import logger from "../../services/logger";

/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 8;

export async function initCommands() {
    const commands = getSlashCommands();
    const commandHash = hash({ version: SLASH_COMMAND_REGISTRATION_VERSION, commands });
    const existingHash = await slashCommandHashRepo.get();

    if (existingHash === commandHash) {
        logger.info(undefined, `No need to update slash commands`);
        return;
    }

    logger.info(undefined, `Updating slash commands for ${client.guilds.cache.size} guild(s)`);
    await clearGlobalCommands();
    await syncAllGuildCommands();
    await slashCommandHashRepo.set(commandHash);
}

/** Guild-scoped commands appear instantly on new servers (global commands can take up to an hour). */
export async function registerGuildCommands(guildId: string) {
    const commands = getSlashCommands();
    await client.application!.commands.set(commands as any, guildId);
    logger.info(guildId, `Registered slash commands for guild`);
}

async function clearGlobalCommands() {
    const applicationCommands = client.application!.commands;
    const globalCommands = await applicationCommands.fetch();
    for (const [, cmd] of globalCommands) {
        logger.info(undefined, `Deleting global slash command: ${cmd.name}`);
        await applicationCommands.delete(cmd.id);
    }
}

async function syncAllGuildCommands() {
    const commands = getSlashCommands();
    await Promise.all(client.guilds.cache.map((guild) => client.application!.commands.set(commands as any, guild.id)));
}

export function getSlashCommands() {
    const S = SLASH_COMMAND.commands;
    return [
        {
            type: ApplicationCommandType.ChatInput,
            name: S.start,
            description: "Start the weather timer",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.stop,
            description: "Stop the weather timer",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.skip.name,
            description: "Skip the current weather",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.reset.name,
            description: "Stop the timer and reset all configuration",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.help,
            description: "Show help",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.language,
            description: "Set the announcement language",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "language",
                    description: "Choose language",
                    required: true,
                    choices: [
                        { name: "English 🇬🇧 (default)", value: "en" },
                        { name: "English 🇺🇸", value: "en-us" },
                        { name: "Indonesia 🇮🇩", value: "id" },
                    ],
                },
            ],
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.athletes.name,
            description: "View or set weathers",
            options: range(1, S.athletes.athletesCount + 1).flatMap((i) => [
                {
                    type: ApplicationCommandOptionType.String,
                    name: `${S.athletes.athletesPrefix}${i}`,
                    description: `Weather ${i}`,
                    required: false,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: `${S.athletes.timePrefix}${i}`,
                    description: `Time in seconds for weather ${i}`,
                    required: false,
                },
            ]),
        },
    ];
}
