"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVoiceConnection = getVoiceConnection;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const environment_1 = require("../environment");
const discord_1 = require("../discord");
const persistence_1 = require("../persistence");
const logger_1 = __importDefault(require("../services/logger"));
const countdownPolicy_1 = require("../countdownPolicy");
const connectToChannel_1 = require("./connectToChannel");
const MAX_REJOIN_ATTEMPTS = 5;
const recoveryByGuild = new Map();
async function getVoiceConnection(config, member, guild) {
    const guildConnection = (0, voice_1.getVoiceConnection)(config.guildId, environment_1.environment.botId);
    const reusableStatuses = new Set([
        voice_1.VoiceConnectionStatus.Ready,
        voice_1.VoiceConnectionStatus.Connecting,
        voice_1.VoiceConnectionStatus.Signalling,
    ]);
    if (guildConnection) {
        (0, connectToChannel_1.monitorVoiceConnection)(guildConnection);
    }
    if (guildConnection?.state.status === voice_1.VoiceConnectionStatus.Ready) {
        recoveryByGuild.delete(config.guildId);
    }
    if (guildConnection && reusableStatuses.has(guildConnection.state.status)) {
        if (config.voiceChannelId !== guildConnection.joinConfig.channelId) {
            await persistence_1.configRepo.set({
                ...config,
                voiceChannelId: guildConnection.joinConfig.channelId ?? undefined,
            });
        }
        return guildConnection;
    }
    if (guildConnection && guildConnection.state.status === voice_1.VoiceConnectionStatus.Disconnected) {
        if (!discord_1.client.isReady()) {
            return guildConnection;
        }
        const recovery = recoveryByGuild.get(config.guildId);
        if (recovery && Date.now() < recovery.retryAt) {
            return guildConnection;
        }
        if (guildConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS && guildConnection.rejoin()) {
            const attempts = (recovery?.attempts ?? 0) + 1;
            const delayMs = (0, countdownPolicy_1.getExponentialRetryDelayMs)(attempts);
            recoveryByGuild.set(config.guildId, { attempts, retryAt: Date.now() + delayMs });
            logger_1.default.warn(config.guildId, `Voice reconnect attempt ${attempts} started; next retry in ${delayMs}ms if needed.`);
            return guildConnection;
        }
        try {
            guildConnection.destroy();
        }
        catch (error) {
            logger_1.default.warn(config.guildId, `Could not destroy disconnected voice connection: ${error}`);
        }
        const attempts = (recovery?.attempts ?? 0) + 1;
        const delayMs = (0, countdownPolicy_1.getExponentialRetryDelayMs)(attempts);
        recoveryByGuild.set(config.guildId, { attempts, retryAt: Date.now() + delayMs });
        logger_1.default.warn(config.guildId, `Voice connection reset; retrying channel join in ${delayMs}ms.`);
        return undefined;
    }
    if (!discord_1.client.isReady()) {
        return undefined;
    }
    const recovery = recoveryByGuild.get(config.guildId);
    if (recovery && Date.now() < recovery.retryAt) {
        return undefined;
    }
    const userVoiceChannel = member?.voice.channel?.type === discord_js_1.ChannelType.GuildVoice ? member.voice.channel : undefined;
    const resolvedGuild = guild ?? (await discord_1.client.guilds.fetch(config.guildId));
    const voiceChannels = resolvedGuild.channels
        .valueOf()
        .filter((channel) => channel.type === discord_js_1.ChannelType.GuildVoice)
        .filter((channel) => channel.joinable);
    let connection;
    if (connection === undefined && userVoiceChannel?.joinable) {
        connection = await (0, connectToChannel_1.connectToChannel)(userVoiceChannel);
    }
    if (connection === undefined && config.voiceChannelId && voiceChannels.has(config.voiceChannelId)) {
        const channel = voiceChannels.get(config.voiceChannelId);
        if (channel) {
            connection = await (0, connectToChannel_1.connectToChannel)(channel);
        }
    }
    if (connection === undefined && voiceChannels.size === 1) {
        const voiceChannel = voiceChannels.first();
        if (voiceChannel) {
            connection = await (0, connectToChannel_1.connectToChannel)(voiceChannel);
        }
    }
    if (config.voiceChannelId !== connection?.joinConfig.channelId) {
        if (connection) {
            logger_1.default.info(connection.joinConfig.guildId, `Connected to VC:${connection.joinConfig.channelId}`);
        }
        await persistence_1.configRepo.set({
            ...config,
            voiceChannelId: connection?.joinConfig.channelId ?? undefined,
        });
    }
    return connection;
}
