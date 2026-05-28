import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import range from "lodash/range";
import hash from "object-hash";
import { SLASH_COMMAND } from "../../constants";
import { client } from "../../discord";
import { slashCommandHashRepo } from "../../persistence";
import logger from "../../services/logger";

/** Bump when slash command registration strategy changes (forces re-sync to all guilds). */
const SLASH_COMMAND_REGISTRATION_VERSION = 15;

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
                    name: "skip",
                    description: "Lewati ke cuaca berikutnya dalam rotasi.",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "reset",
                    description: "Hentikan timer dan reset semua konfigurasi server.",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "status",
                    description: "Tampilkan status timer cuaca saat ini.",
                },
            ],
        },
        {
            type: ApplicationCommandType.ChatInput,
            name: S.music,
            description: "Putar musik YouTube di voice channel",
            options: [
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "play",
                    description: "Tambahkan URL YouTube ke antrian dan mulai putar.",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "url",
                            description: "Link YouTube yang akan diputar",
                            required: true,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "stop",
                    description: "Hentikan musik dan bersihkan antrian.",
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "skip",
                    description: "Lewati lagu saat ini ke lagu berikutnya dalam antrian.",
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
            name: S.sleepcall,
            description: "Bot tetap di VC 24/7 sambil memutar live music YouTube",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
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
                    type: ApplicationCommandOptionType.String,
                    name: "url",
                    description: "Link YouTube Live (opsional jika sudah pernah diset)",
                    required: false,
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
