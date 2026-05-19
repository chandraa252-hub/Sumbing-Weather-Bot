"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommands = initCommands;
exports.registerGuildCommands = registerGuildCommands;
exports.getSlashCommands = getSlashCommands;
const discord_js_1 = require("discord.js");
const range_1 = __importDefault(require("lodash/range"));
const object_hash_1 = __importDefault(require("object-hash"));
const constants_1 = require("../../constants");
const discord_1 = require("../../discord");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 9;
async function initCommands() {
    const commands = getSlashCommands();
    const commandHash = (0, object_hash_1.default)({ version: SLASH_COMMAND_REGISTRATION_VERSION, commands });
    const existingHash = await persistence_1.slashCommandHashRepo.get();
    if (existingHash === commandHash) {
        logger_1.default.info(undefined, `No need to update slash commands`);
        return;
    }
    logger_1.default.info(undefined, `Updating slash commands for ${discord_1.client.guilds.cache.size} guild(s)`);
    await clearGlobalCommands();
    await syncAllGuildCommands();
    await persistence_1.slashCommandHashRepo.set(commandHash);
}
async function registerGuildCommands(guildId) {
    const commands = getSlashCommands();
    await discord_1.client.application.commands.set(commands, guildId);
    logger_1.default.info(guildId, `Registered slash commands for guild`);
}
async function clearGlobalCommands() {
    const applicationCommands = discord_1.client.application.commands;
    const globalCommands = await applicationCommands.fetch();
    for (const [, cmd] of globalCommands) {
        logger_1.default.info(undefined, `Deleting global slash command: ${cmd.name}`);
        await applicationCommands.delete(cmd.id);
    }
}
async function syncAllGuildCommands() {
    const commands = getSlashCommands();
    await Promise.all(discord_1.client.guilds.cache.map((guild) => discord_1.client.application.commands.set(commands, guild.id)));
}
function getSlashCommands() {
    const S = constants_1.SLASH_COMMAND.commands;
    return [
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.start,
            description: "Start the weather timer",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.stop,
            description: "Stop the weather timer",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.skip.name,
            description: "Skip the current weather",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.reset.name,
            description: "Stop the timer and reset all configuration",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.help,
            description: "Show help",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.status,
            description: "Show current timer status",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.leave,
            description: "Force disconnect bot from voice channel",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.language,
            description: "Set the announcement language",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
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
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.athletes.name,
            description: "View or set weathers",
            options: (0, range_1.default)(1, S.athletes.athletesCount + 1).flatMap((i) => [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: `${S.athletes.athletesPrefix}${i}`,
                    description: `Weather ${i}`,
                    required: false,
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Integer,
                    name: `${S.athletes.timePrefix}${i}`,
                    description: `Time in seconds for weather ${i}`,
                    required: false,
                },
            ]),
        },
    ];
}
