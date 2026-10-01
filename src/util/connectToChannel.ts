import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { VoiceChannel } from "discord.js";
import { environment } from "../environment";
import logger from "../services/logger";

const monitoredConnections = new WeakSet<VoiceConnection>();

export function monitorVoiceConnection(connection: VoiceConnection): void {
    if (monitoredConnections.has(connection)) {
        return;
    }
    monitoredConnections.add(connection);

    connection.on("error", (error: Error) => {
        logger.warn(connection.joinConfig.guildId, `Voice connection error: ${error.message}`);
    });
    connection.on("stateChange", (_oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Disconnected) {
            logger.warn(connection.joinConfig.guildId, "Voice connection disconnected; recovery will be attempted.");
        }
    });
}

export async function connectToChannel(channel: VoiceChannel): Promise<VoiceConnection | undefined> {
    if (!channel.joinable) return undefined;
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        group: environment.botId,
    });
    monitorVoiceConnection(connection);
    logger.info(channel.guildId, `Joined VC:${channel.id}`);
    return connection;
}
