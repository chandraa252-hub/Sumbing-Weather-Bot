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
const connectToChannel_1 = require("./connectToChannel");
async function getVoiceConnection(config, member, guild) {
    const guildConnection = (0, voice_1.getVoiceConnection)(config.guildId, environment_1.environment.botId);
    const reusableStatuses = new Set([
        voice_1.VoiceConnectionStatus.Ready,
        voice_1.VoiceConnectionStatus.Connecting,
        voice_1.VoiceConnectionStatus.Signalling,
    ]);
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
        try {
            guildConnection.destroy();
        }
        catch (error) {
            logger_1.default.warn(config.guildId, `Could not destroy disconnected voice connection: ${error}`);
        }
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
