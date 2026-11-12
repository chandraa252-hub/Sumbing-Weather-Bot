import { getVoiceConnection as getExistingVoiceConnection, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { ChannelType, Guild, GuildMember } from "discord.js";
import { environment } from "../environment";
import { client } from "../discord";
import { configRepo } from "../persistence";
import logger from "../services/logger";
import type { Config } from "../types";
import { getExponentialRetryDelayMs } from "../countdownPolicy";
import { connectToChannel, monitorVoiceConnection } from "./connectToChannel";

const MAX_AUTO_RECOVERY_ATTEMPTS = 3;
type RecoveryState = { attempts: number; retryAt: number; exhausted: boolean };
const recoveryByGuild = new Map<string, RecoveryState>();
const connectionResolutionByGuild = new Map<string, Promise<VoiceConnection | undefined>>();

export function getVoiceConnection(
    config: Config,
    member?: GuildMember,
    guild?: Guild
): Promise<VoiceConnection | undefined> {
    const previous = connectionResolutionByGuild.get(config.guildId);
    const current = (previous ?? Promise.resolve(undefined))
        .catch(() => undefined)
        .then(() => resolveVoiceConnection(config, member, guild));
    connectionResolutionByGuild.set(config.guildId, current);
    void current.finally(() => {
        if (connectionResolutionByGuild.get(config.guildId) === current) {
            connectionResolutionByGuild.delete(config.guildId);
        }
    }).catch(() => undefined);
    return current;
}

async function resolveVoiceConnection(
    config: Config,
    member?: GuildMember,
    guild?: Guild
): Promise<VoiceConnection | undefined> {
    let guildConnection = getExistingVoiceConnection(config.guildId, environment.botId);
    const isManualStart = member !== undefined || guild !== undefined;
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

    // /weather start is an explicit user action. It may bypass an exhausted
    // automatic recovery episode, but the episode is only reset after Ready.
    if (isManualStart) {
        if (
            guildConnection &&
            (guildConnection.state.status === VoiceConnectionStatus.Disconnected ||
                guildConnection.state.status === VoiceConnectionStatus.Destroyed)
        ) {
            try {
                guildConnection.destroy();
            } catch (error) {
                logger.warn(config.guildId, `Could not destroy disconnected voice connection for manual start: ${error}`);
            }
            guildConnection = undefined;
        }
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

        const recovery = recoveryByGuild.get(config.guildId) ?? { attempts: 0, retryAt: 0, exhausted: false };
        if (recovery.exhausted) {
            try {
                guildConnection.destroy();
            } catch (error) {
                logger.warn(config.guildId, `Could not destroy exhausted voice connection: ${error}`);
            }
            return undefined;
        }
        if (Date.now() < recovery.retryAt) return guildConnection;

        if (recovery.attempts >= MAX_AUTO_RECOVERY_ATTEMPTS) {
            recoveryByGuild.set(config.guildId, {
                ...recovery,
                retryAt: Number.POSITIVE_INFINITY,
                exhausted: true,
            });
            try {
                guildConnection.destroy();
            } catch (error) {
                logger.warn(config.guildId, `Could not destroy exhausted voice connection: ${error}`);
            }
            logger.warn(
                config.guildId,
                `Voice recovery exhausted after ${recovery.attempts} attempts; automatic reconnect is disabled until Ready or a manual start.`
            );
            return undefined;
        }

        const attempts = recovery.attempts + 1;
        const delayMs = getExponentialRetryDelayMs(attempts);
        let rejoined = false;
        try {
            rejoined = guildConnection.rejoin();
        } catch (error) {
            logger.warn(config.guildId, `Could not rejoin voice connection: ${error}`);
        }

        if (rejoined) {
            recoveryByGuild.set(config.guildId, {
                attempts,
                retryAt: Date.now() + delayMs,
                exhausted: false,
            });
            logger.warn(config.guildId, `Voice reconnect attempt ${attempts} started; next retry in ${delayMs}ms if needed.`);
            return guildConnection;
        }

        const exhausted = attempts >= MAX_AUTO_RECOVERY_ATTEMPTS;
        recoveryByGuild.set(config.guildId, {
            attempts,
            retryAt: exhausted ? Number.POSITIVE_INFINITY : Date.now() + delayMs,
            exhausted,
        });
        try {
            guildConnection.destroy();
        } catch (error) {
            logger.warn(config.guildId, `Could not destroy disconnected voice connection: ${error}`);
        }
        logger.warn(
            config.guildId,
            exhausted
                ? `Voice recovery exhausted after ${attempts} attempts; automatic reconnect is disabled until Ready or a manual start.`
                : `Voice connection reset; retrying channel join in ${delayMs}ms.`
        );
        return undefined;
    }

    if (!client.isReady()) {
        return undefined;
    }

    let recovery = recoveryByGuild.get(config.guildId);
    if (!isManualStart) {
        if (recovery?.exhausted) return undefined;
        if (recovery && Date.now() < recovery.retryAt) return undefined;
        if (recovery && recovery.attempts >= MAX_AUTO_RECOVERY_ATTEMPTS) {
            recovery = { ...recovery, retryAt: Number.POSITIVE_INFINITY, exhausted: true };
            recoveryByGuild.set(config.guildId, recovery);
            logger.warn(
                config.guildId,
                `Voice recovery exhausted after ${recovery.attempts} attempts; automatic reconnect is disabled until Ready or a manual start.`
            );
            return undefined;
        }
    }

    const userVoiceChannel =
        member?.voice.channel?.type === ChannelType.GuildVoice ? member.voice.channel : undefined;
    const resolvedGuild = guild ?? (await client.guilds.fetch(config.guildId));
    const voiceChannels = resolvedGuild.channels
        .valueOf()
        .filter((channel) => channel.type === ChannelType.GuildVoice)
        .filter((channel) => channel.joinable);

    const configuredVoiceChannel = config.voiceChannelId
        ? voiceChannels.get(config.voiceChannelId)
        : undefined;
    const selectedVoiceChannel = userVoiceChannel?.joinable
        ? userVoiceChannel
        : configuredVoiceChannel ?? (voiceChannels.size === 1 ? voiceChannels.first() : undefined);

    let connection: VoiceConnection | undefined;
    if (selectedVoiceChannel) {
        let attempts = 0;
        let retryAt = 0;
        if (!isManualStart) {
            attempts = (recovery?.attempts ?? 0) + 1;
            retryAt = Date.now() + getExponentialRetryDelayMs(attempts);
            recoveryByGuild.set(config.guildId, {
                attempts,
                retryAt,
                exhausted: false,
            });
        }

        try {
            connection = await connectToChannel(selectedVoiceChannel);
        } catch (error) {
            logger.warn(config.guildId, `Could not create voice connection: ${error}`);
        }

        if (!isManualStart && !connection && attempts >= MAX_AUTO_RECOVERY_ATTEMPTS) {
            recoveryByGuild.set(config.guildId, {
                attempts,
                retryAt: Number.POSITIVE_INFINITY,
                exhausted: true,
            });
            logger.warn(
                config.guildId,
                `Voice recovery exhausted after ${attempts} attempts; automatic reconnect is disabled until Ready or a manual start.`
            );
        } else if (!isManualStart && !connection) {
            recoveryByGuild.set(config.guildId, { attempts, retryAt, exhausted: false });
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
