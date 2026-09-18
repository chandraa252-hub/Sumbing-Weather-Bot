import { GuildMember, Interaction, TextChannel, VoiceChannel } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import {
    SLASH_COMMAND,
    BUTTON_SOUNDBOARD_OPEN,
    BUTTON_SOUND_PREFIX,
    BUTTON_SOUNDBOARD_CLOSE,
} from "../../constants";
import { environment } from "../../environment";
import { configRepo, timerRepo } from "../../persistence";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";
import { BUTTON_HELP, BUTTON_STOP } from "../../services/statusMessage";
import { stopTimer } from "../../services/timer";
import { connectToChannel } from "../../util/connectToChannel";
import { playSound } from "../../services/soundboard";
import { createSoundboardPanel } from "./soundboard";
import { createHelpEmbed, help } from "./help";
import { weather } from "./weather";
import { language as setLanguage } from "./language";
import { leave } from "./leave";
import { soundboard } from "./soundboard";
import { join } from "./join";
import { adminMessage } from "./adminMessage";

const commandsMap: Record<string, (interaction: any, scope: any) => Promise<void>> = {
    [SLASH_COMMAND.commands.help]: help,
    [SLASH_COMMAND.commands.weather]: weather,
    [SLASH_COMMAND.commands.language]: setLanguage,
    [SLASH_COMMAND.commands.leave]: leave,
    [SLASH_COMMAND.commands.soundboard]: soundboard,
    [SLASH_COMMAND.commands.join]: join,
    [SLASH_COMMAND.commands.adminMessage]: adminMessage,
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
            case BUTTON_HELP:
                await interaction.followUp({
                    embeds: [await createHelpEmbed(guildId)],
                    ephemeral: true,
                });
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

    const weatherSubcommand =
        commandName === SLASH_COMMAND.commands.weather
            ? interaction.options.getSubcommand(false)
            : undefined;
    const isGlobalTimerCommand = ["start-global", "stop-global", "adjust-global"].includes(weatherSubcommand ?? "");
    const isAdminMessageCommand = commandName === SLASH_COMMAND.commands.adminMessage;
    await interaction.deferReply(isGlobalTimerCommand || isAdminMessageCommand ? { ephemeral: true } : undefined);

    const command = commandsMap[commandName];
    if (command) {
        await command(interaction, scope);
    } else {
        await interaction.editReply("Unsupported command");
    }
}
