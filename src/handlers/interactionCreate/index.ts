import { GuildMember, Interaction, VoiceChannel } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import {
    SLASH_COMMAND,
    BUTTON_SOUNDBOARD_OPEN,
    BUTTON_SOUND_PREFIX,
    BUTTON_SOUNDBOARD_CLOSE,
    BUTTON_MUSIC_SKIP,
    BUTTON_MUSIC_STOP,
} from "../../constants";
import { environment } from "../../environment";
import { configRepo, timerRepo } from "../../persistence";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";
import { BUTTON_SKIP, BUTTON_STOP, updateStatusMessage } from "../../services/statusMessage";
import { skipCurrentAthlete, stopTimer } from "../../services/timer";
import { connectToChannel } from "../../util/connectToChannel";
import { playSound } from "../../services/soundboard";
import { skipCurrentSong, stopMusicQueue } from "../../services/musicQueue";
import { createSoundboardPanel } from "./soundboard";
import { athletes } from "./athletes";
import { help } from "./help";
import { weather } from "./weather";
import { music } from "./music";
import { language as setLanguage } from "./language";
import { leave } from "./leave";
import { soundboard } from "./soundboard";
import { join } from "./join";
import { sleepcall } from "./sleepcall";

const commandsMap: Record<string, (interaction: any, scope: any) => Promise<void>> = {
    [SLASH_COMMAND.commands.help]: help,
    [SLASH_COMMAND.commands.weather]: weather,
    [SLASH_COMMAND.commands.music]: music,
    [SLASH_COMMAND.commands.athletes.name]: athletes,
    [SLASH_COMMAND.commands.language]: setLanguage,
    [SLASH_COMMAND.commands.leave]: leave,
    [SLASH_COMMAND.commands.soundboard]: soundboard,
    [SLASH_COMMAND.commands.join]: join,
    [SLASH_COMMAND.commands.sleepcall]: sleepcall,
};

export async function handleInteractionCreate({ args: [interaction], scope }: HandlerProps<[Interaction]>) {
    if (interaction.isButton() && interaction.inGuild()) {
        const guildId = interaction.guildId;
        const customId = interaction.customId;

        logger.info(guildId, `Button: ${customId} by ${interaction.user.id}`);

        if (customId === BUTTON_SOUNDBOARD_OPEN) {
            await interaction.deferUpdate();
            const config = await configRepo.get(guildId);
            const member = interaction.member as GuildMember | null;
            const voiceChannelId = member?.voice?.channelId;
            if (voiceChannelId) {
                const existing = getVoiceConnection(guildId, environment.botId);
                if (!existing) {
                    const channel = interaction.guild?.channels.cache.get(voiceChannelId) as VoiceChannel | undefined;
                    if (channel) {
                        connectToChannel(channel).catch(() => {});
                    }
                }
            }
            await interaction.followUp({ ...createSoundboardPanel(config.languageKey), ephemeral: true });
            return;
        }

        if (customId === BUTTON_SOUNDBOARD_CLOSE) {
            await interaction.deferUpdate();
            await interaction.deleteReply().catch(() => {});
            return;
        }

        if (customId.startsWith(BUTTON_SOUND_PREFIX)) {
            await interaction.deferUpdate();
            const soundName = customId.slice(BUTTON_SOUND_PREFIX.length);
            const member = interaction.member as GuildMember | null;
            const voiceChannelId = member?.voice?.channelId;

            if (!voiceChannelId) {
                await interaction.followUp({ content: "❌ Kamu harus berada di voice channel terlebih dahulu.", ephemeral: true });
                return;
            }

            let conn = getVoiceConnection(guildId, environment.botId);
            if (!conn) {
                const channel = interaction.guild?.channels.cache.get(voiceChannelId) as VoiceChannel | undefined;
                if (channel) {
                    conn = await connectToChannel(channel) ?? undefined;
                }
            }

            if (!conn) {
                await interaction.followUp({ content: "❌ Tidak bisa bergabung ke voice channel.", ephemeral: true });
                return;
            }

            const played = await playSound(soundName, conn);
            if (!played) {
                await interaction.followUp({ content: `❌ Audio tidak ditemukan: \`${soundName}\``, ephemeral: true });
            }
            return;
        }

        if (customId === BUTTON_MUSIC_SKIP) {
            await interaction.deferUpdate();
            const skipped = skipCurrentSong(guildId);
            if (skipped) {
                await interaction.followUp({ content: "⏭ Lagu dilewati.", ephemeral: true });
            } else {
                await interaction.followUp({ content: "ℹ️ Tidak ada musik yang sedang diputar.", ephemeral: true });
            }
            return;
        }

        if (customId === BUTTON_MUSIC_STOP) {
            await interaction.deferUpdate();
            const stopped = stopMusicQueue(guildId);
            if (stopped) {
                await interaction.followUp({ content: "⏹ Musik dihentikan.", ephemeral: true });
            } else {
                await interaction.followUp({ content: "ℹ️ Tidak ada musik yang sedang diputar.", ephemeral: true });
            }
            return;
        }

        await interaction.deferUpdate();
        const timer = await timerRepo.get(guildId);
        if (!timer) return;

        if (
            timer.status?.channelId !== interaction.channelId ||
            timer.status?.messageId !== interaction.message.id
        ) {
            return;
        }

        switch (customId) {
            case BUTTON_SKIP:
                await skipCurrentAthlete(guildId);
                await updateStatusMessage(guildId, scope);
                break;

            case BUTTON_STOP: {
                await stopTimer(guildId, scope);
                break;
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand() || !interaction.inGuild()) {
        return;
    }
    const guildId = interaction.guildId;

    const commandName = interaction.commandName;
    logger.info(guildId, `Slash Command: ${commandName}`);

    await interaction.deferReply();

    const command = commandsMap[commandName];
    if (command) {
        await command(interaction, scope);
    } else {
        await interaction.editReply("Unsupported command");
    }
}
