"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommands = initCommands;
exports.registerGuildCommands = registerGuildCommands;
exports.getSlashCommands = getSlashCommands;
const discord_js_1 = require("discord.js");
const object_hash_1 = __importDefault(require("object-hash"));
const constants_1 = require("../../constants");
const discord_1 = require("../../discord");
const persistence_1 = require("../../persistence");
const logger_1 = __importDefault(require("../../services/logger"));
/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 23;
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
/** Guild-scoped commands appear instantly on new servers (global commands can take up to an hour). */
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
            name: S.weather,
            description: "Kelola timer cuaca rotasi",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "start",
                    description: "Mulai timer cuaca. Masuk voice channel terlebih dahulu.",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "stop",
                    description: "Hentikan timer (bot tetap di channel).",
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "start-global",
                    description: "Mulai timer global (khusus admin global).",
                    options: [
                        {
                            type: discord_js_1.ApplicationCommandOptionType.String,
                            name: "time",
                            description: "Waktu WITA HH.MM.SS, default langsung mulai.",
                            required: false,
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "stop-global",
                    description: "Hentikan timer global (khusus admin global).",
                    options: [
                        {
                            type: discord_js_1.ApplicationCommandOptionType.String,
                            name: "time",
                            description: "Waktu WITA HH.MM.SS, default langsung berhenti.",
                            required: false,
                        },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "adjust-global",
                    description: "Sesuaikan timer global (khusus admin global).",
                    options: [
                        {
                            type: discord_js_1.ApplicationCommandOptionType.String,
                            name: "time",
                            description: "Waktu WITA HH.MM.SS (opsional).",
                            required: false,
                        },
                        {
                            type: discord_js_1.ApplicationCommandOptionType.Integer,
                            name: "offset",
                            description: "Koreksi acuan lama dalam detik; positif maju, negatif mundur.",
                            required: false,
                            min_value: -86400,
                            max_value: 86400,
                        },
                        {
                            type: discord_js_1.ApplicationCommandOptionType.Number,
                            name: "duration",
                            description: "Durasi satu siklus timer dalam detik, boleh desimal.",
                            required: false,
                            min_value: 0.001,
                            max_value: 86400,
                        },
                    ],
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.help,
            description: "Show help",
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
            name: S.soundboard,
            description: "Open the soundboard panel",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.join,
            description: "Join your voice channel and show the soundboard",
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.adminMessage,
            description: "Kirim pesan ke channel status semua guild (khusus admin global).",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "message",
                    description: "Pesan yang akan dikirim.",
                    required: true,
                    max_length: 2000,
                },
            ],
        },
    ];
}
