import { createAudioPlayer, createAudioResource, entersState, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import path from "path";
import fs from "fs";
import logger from "./logger";
import { duckSleepcall, unduckSleepcall, isSleepcallActive } from "./sleepcall";
import { pauseMusicForInterrupt, resumeMusicAfterInterrupt, isMusicActive } from "./musicQueue";

const SOUNDS_DIR = path.join(process.cwd(), "sounds");
const SUPPORTED_EXTENSIONS = [".mp3", ".ogg", ".wav"];

export interface SoundEntry {
    name: string;
    value: string;
}

function toTitleCase(str: string): string {
    return str.replace(/[-_]/g, " ").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function listSounds(): SoundEntry[] {
    if (!fs.existsSync(SOUNDS_DIR)) return [];
    return fs.readdirSync(SOUNDS_DIR)
        .filter((file) => SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()))
        .map((file) => {
            const value = path.basename(file, path.extname(file));
            return { name: toTitleCase(value), value };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSoundPath(soundName: string): string | undefined {
    for (const ext of SUPPORTED_EXTENSIONS) {
        const filePath = path.join(SOUNDS_DIR, `${soundName}${ext}`);
        if (fs.existsSync(filePath)) return filePath;
    }
    return undefined;
}

export async function playSound(soundName: string, connection: VoiceConnection): Promise<boolean> {
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 3_000);
        } catch {
            return false;
        }
    }
    const soundPath = getSoundPath(soundName);
    if (!soundPath) {
        logger.info(connection.joinConfig.guildId, `Sound not found: ${soundName}`);
        return false;
    }
    logger.info(connection.joinConfig.guildId, `Playing sound: ${soundName}`);
    const guildId = connection.joinConfig.guildId;
    const wasSleepcallActive = isSleepcallActive(guildId);
    const wasMusicActive = isMusicActive(guildId);

    // Duck sleepcall (volume-based)
    if (wasSleepcallActive) duckSleepcall(guildId);
    // Pause music (stops current song cleanly; resumes after soundboard)
    if (wasMusicActive) pauseMusicForInterrupt(guildId);

    try {
    await new Promise<void>((resolve, reject) => {
        const player = createAudioPlayer();
        const subscription = connection.subscribe(player);
        const resource = createAudioResource(soundPath);
        player.play(resource);
        player.on("error", (err) => {
            subscription?.unsubscribe();
            reject(err);
        });
        const timeout = setTimeout(() => {
            player.stop();
            subscription?.unsubscribe();
            resolve();
        }, 15_000);
        resource.playStream.on("end", () => {
            clearTimeout(timeout);
            subscription?.unsubscribe();
            resolve();
        });
    });
    } finally {
        if (wasSleepcallActive) unduckSleepcall(guildId);
        // Signal music queue that soundboard is done — it will restart the current song
        if (wasMusicActive) resumeMusicAfterInterrupt(guildId);
    }
    return true;
}
