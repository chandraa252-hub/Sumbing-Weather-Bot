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
const SLASH_COMMAND_REGISTRATION_VERSION = 15;
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
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "start",  description: "Mulai timer cuaca. Masuk voice channel terlebih dahulu." },
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "stop",   description: "Hentikan timer (bot tetap di channel)." },
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "skip",   description: "Lewati ke cuaca berikutnya dalam rotasi." },
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "reset",  description: "Hentikan timer dan reset semua konfigurasi server." },
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "status", description: "Tampilkan status timer cuaca saat ini." },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandType.ChatInput,
            name: S.music,
            description: "Putar musik YouTube di voice channel",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
                    name: "play",
                    description: "Tambahkan URL YouTube ke antrian dan mulai putar.",
                    options: [
                        {
                            type: discord_js_1.ApplicationCommandOptionType.String,
                            name: "url",
                            description: "Link YouTube yang akan diputar",
                            required: true,
                        },
                    ],
                },
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "stop", description: "Hentikan musik dan bersihkan antrian." },
                { type: discord_js_1.ApplicationCommandOptionType.Subcommand, name: "skip", description: "Lewati lagu saat ini ke lagu berikutnya dalam antrian." },
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
            name: S.sleepcall,
            description: "Bot tetap di VC 24/7 sambil memutar live music YouTube",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "action",
                    description: "Mulai atau hentikan sleepcall",
                    required: false,
                    choices: [
                        { name: "▶️ Start", value: "start" },
                        { name: "⏹️ Stop", value: "stop" },
                        { name: "📊 Status", value: "status" },
                    ],
                },
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    name: "url",
                    description: "Link YouTube Live (opsional jika sudah pernah diset)",
                    required: false,
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
