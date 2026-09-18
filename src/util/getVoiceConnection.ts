import { getVoiceConnection as getExistingVoiceConnection, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { ChannelType, Guild, GuildMember } from "discord.js";
import { environment } from "../environment";
import { client } from "../discord";
import { configRepo } from "../persistence";
import logger from "../services/logger";
import type { Config } from "../types";
import { connectToChannel } from "./connectToChannel";

export async function getVoiceConnection(
    config: Config,
    member?: GuildMember,
    guild?: Guild
): Promise<VoiceConnection | undefined> {
    const guildConnection = getExistingVoiceConnection(config.guildId, environment.botId);
    const reusableStatuses = new Set([
        VoiceConnectionStatus.Ready,
        VoiceConnectionStatus.Connecting,
        VoiceConnectionStatus.Signalling,
    ]);

    if (guildConnection && reusableStatuses.has(guildConnection.state.status)) {
        if (config.voiceChannelId !== guildConnection.joinConfig.channelId) {
            await configRepo.set({
                ...config,
                voiceChannelId: guildConnection.joinConfig.channelId ?? undefined,
            });
        }
        return guildConnection;
    }

    if (guildConnection && guildConnection.state.status === VoiceConnectionStatus.Disconnected) {
        try {
            guildConnection.destroy();
        } catch (error) {
            logger.warn(config.guildId, `Could not destroy disconnected voice connection: ${error}`);
        }
    }

    const userVoiceChannel =
        member?.voice.channel?.type === ChannelType.GuildVoice ? member.voice.channel : undefined;
    const resolvedGuild = guild ?? (await client.guilds.fetch(config.guildId));
    const voiceChannels = resolvedGuild.channels
        .valueOf()
        .filter((channel) => channel.type === ChannelType.GuildVoice)
        .filter((channel) => channel.joinable);

    let connection: VoiceConnection | undefined;

    if (connection === undefined && userVoiceChannel?.joinable) {
        connection = await connectToChannel(userVoiceChannel);
    }

    if (connection === undefined && config.voiceChannelId && voiceChannels.has(config.voiceChannelId)) {
        const channel = voiceChannels.get(config.voiceChannelId);
        if (channel) {
            connection = await connectToChannel(channel);
        }
    }

    if (connection === undefined && voiceChannels.size === 1) {
        const voiceChannel = voiceChannels.first();
        if (voiceChannel) {
            connection = await connectToChannel(voiceChannel);
        }
    }

    if (config.voiceChannelId !== connection?.joinConfig.channelId) {
        if (connection) {
            logger.info(connection.joinConfig.guildId, `Connected to VC:${connection.joinConfig.channelId}`);
        }
        await configRepo.set({
            ...config,
            voiceChannelId: connection?.joinConfig.channelId ?? undefined,
        });
    }

    return connection;
}