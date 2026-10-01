import { getVoiceConnection as getExistingVoiceConnection, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { ChannelType, Guild, GuildMember } from "discord.js";
import { environment } from "../environment";
import { client } from "../discord";
import { configRepo } from "../persistence";
import logger from "../services/logger";
import type { Config } from "../types";
import { getExponentialRetryDelayMs } from "../countdownPolicy";
import { connectToChannel, monitorVoiceConnection } from "./connectToChannel";

const MAX_REJOIN_ATTEMPTS = 5;
const recoveryByGuild = new Map<string, { attempts: number; retryAt: number }>();

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

    if (guildConnection) {
        monitorVoiceConnection(guildConnection);
    }

    if (guildConnection?.state.status === VoiceConnectionStatus.Ready) {
        recoveryByGuild.delete(config.guildId);
    }

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
        if (!client.isReady()) {
            return guildConnection;
        }

        const recovery = recoveryByGuild.get(config.guildId);
        if (recovery && Date.now() < recovery.retryAt) {
            return guildConnection;
        }

        if (guildConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS && guildConnection.rejoin()) {
            const attempts = (recovery?.attempts ?? 0) + 1;
            const delayMs = getExponentialRetryDelayMs(attempts);
            recoveryByGuild.set(config.guildId, { attempts, retryAt: Date.now() + delayMs });
            logger.warn(config.guildId, `Voice reconnect attempt ${attempts} started; next retry in ${delayMs}ms if needed.`);
            return guildConnection;
        }

        try {
            guildConnection.destroy();
        } catch (error) {
            logger.warn(config.guildId, `Could not destroy disconnected voice connection: ${error}`);
        }
        const attempts = (recovery?.attempts ?? 0) + 1;
        const delayMs = getExponentialRetryDelayMs(attempts);
        recoveryByGuild.set(config.guildId, { attempts, retryAt: Date.now() + delayMs });
        logger.warn(config.guildId, `Voice connection reset; retrying channel join in ${delayMs}ms.`);
        return undefined;
    }

    if (!client.isReady()) {
        return undefined;
    }

    const recovery = recoveryByGuild.get(config.guildId);
    if (recovery && Date.now() < recovery.retryAt) {
        return undefined;
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