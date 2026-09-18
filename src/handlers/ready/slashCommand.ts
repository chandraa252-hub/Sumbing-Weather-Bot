import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import hash from "object-hash";
import { SLASH_COMMAND } from "../../constants";
import { client } from "../../discord";
import { slashCommandHashRepo } from "../../persistence";
import logger from "../../services/logger";

/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 23;

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
    await Promise.all(
        client.guilds.cache.map((guild) => client.application!.commands.set(commands as any, guild.id))
    );
}

export function getSlashCommands() {
    const S = SLASH_COMMAND.commands;
    return [
        {
            type: ApplicationCommandType.ChatInput,
            name: S.weather,
            description: "Kelola timer cuaca rotasi",
            options: [
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "start",
                    description: "Mulai timer cuaca. Masuk voice channel terlebih dahulu.",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "stop",
                    description: "Hentikan timer (bot tetap di channel).",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "start-global",
                    description: "Mulai timer global (khusus admin global).",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "time",
                            description: "Waktu WITA HH.MM.SS, default langsung mulai.",
                            required: false,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "stop-global",
                    description: "Hentikan timer global (khusus admin global).",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "time",
                            description: "Waktu WITA HH.MM.SS, default langsung berhenti.",
                            required: false,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "adjust-global",
                    description: "Sesuaikan timer global (khusus admin global).",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "time",
                            description: "Waktu WITA HH.MM.SS (opsional).",
                            required: false,
                        },
                        {
                            type: ApplicationCommandOptionType.Integer,
                            name: "offset",
                            description: "Koreksi acuan lama dalam detik; positif maju, negatif mundur.",
                            required: false,
                            min_value: -86400,
                            max_value: 86400,
                        },
                        {
                            type: ApplicationCommandOptionType.Number,
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
            type: ApplicationCommandType.ChatInput,
            name: S.help,
            description: "Show help",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.leave,
            description: "Force disconnect bot from voice channel",
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
            name: S.soundboard,
            description: "Open the soundboard panel",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.join,
            description: "Join your voice channel and show the soundboard",
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.adminMessage,
            description: "Kirim pesan ke channel status semua guild (khusus admin global).",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "message",
                    description: "Pesan yang akan dikirim.",
                    required: true,
                    max_length: 2000,
                },
            ],
        },
    ];
}
