"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommands = initCommands;
exports.registerGuildCommands = registerGuildCommands;
exports.getSlashCommand = getSlashCommand;
const discord_js_1 = require("discord.js");
const range_1 = __importDefault(require("lodash/range"));
const object_hash_1 = __importDefault(require("object-hash"));
const constants_1 = require("../../constants");
const discord_1 = require("../../discord");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 6;
async function initCommands() {
    const command = getSlashCommand();
    const commandHash = (0, object_hash_1.default)({ version: SLASH_COMMAND_REGISTRATION_VERSION, command });
    const existingHash = await persistence_1.slashCommandHashRepo.get();
    if (existingHash === commandHash) {
        logger_1.default.info(undefined, `No need to update slash command`);
        return;
    }
    logger_1.default.info(undefined, `Updating slash command for ${discord_1.client.guilds.cache.size} guild(s)`);
    await clearGlobalCommands(command.name);
    await syncAllGuildCommands();
    await persistence_1.slashCommandHashRepo.set(commandHash);
}
/** Guild-scoped commands appear instantly on new servers (global commands can take up to an hour). */
async function registerGuildCommands(guildId) {
    const command = getSlashCommand();
    await discord_1.client.application.commands.set([command], guildId);
    logger_1.default.info(guildId, `Registered slash command for guild`);
}
async function clearGlobalCommands(currentCommandName) {
    const applicationCommands = discord_1.client.application.commands;
    const globalCommands = await applicationCommands.fetch();
    for (const [, cmd] of globalCommands) {
        if (cmd.name !== currentCommandName) {
            logger_1.default.info(undefined, `Deleting stale global slash command: ${cmd.name}`);
        }
        else {
            logger_1.default.info(undefined, `Removing global slash command (using guild-scoped commands)`);
        }
        await applicationCommands.delete(cmd.id);
    }
}
async function syncAllGuildCommands() {
    const command = getSlashCommand();
    await Promise.all(discord_1.client.guilds.cache.map((guild) => discord_1.client.application.commands.set([command], guild.id)));
}
function getSlashCommand() {
    return {
        name: constants_1.SLASH_COMMAND.name,
        ...command,
    };
}
const command = {
    type: discord_js_1.ApplicationCommandType.ChatInput,
    description: "Timer",
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.start,
            description: "Start the timer",
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.stop,
            description: "Stop the timer",
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.skip.name,
            description: "Skip the current weather",
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.reset.name,
            description: "Stops the timer and resets all configuration",
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.help,
            description: "Help",
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.language,
            description: "Set the announcement language",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "language",
                    description: "Choose language",
                    required: true,
                    choices: [
                        { name: "English 🇬🇧", value: "en" },
                        { name: "Indonesia 🇮🇩", value: "id" },
                    ],
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: constants_1.SLASH_COMMAND.commands.athletes.name,
            description: "Get or set weathers",
            options: (0, range_1.default)(1, constants_1.SLASH_COMMAND.commands.athletes.athletesCount + 1).flatMap((i) => [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: `${constants_1.SLASH_COMMAND.commands.athletes.athletesPrefix}${i}`,
                    description: `Weather ${i}`,
                    required: false,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    name: `${constants_1.SLASH_COMMAND.commands.athletes.timePrefix}${i}`,
                    description: `Time in seconds for weather ${i}`,
                    required: false,
                },
            ]),
        },
    ],
};
