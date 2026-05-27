import { execFile, spawn } from "child_process";
import {
    getVoiceConnection,
    entersState,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    StreamType,
} from "@discordjs/voice";
import ffmpegStatic from "ffmpeg-static";
import logger from "./logger";
import { environment } from "../environment";
import { connectToChannel } from "../util/connectToChannel";
import { Guild } from "discord.js";

const ffmpegPath: string = (ffmpegStatic as any).default ?? ffmpegStatic;

interface SleepcallController {
    active: boolean;
}

const activeSleepcalls = new Map<string, SleepcallController>();

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getYtDlpUrl(youtubeUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(
            "yt-dlp",
            [
                "-f", "bestaudio/best",
                "--get-url",
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android,web",
                "--no-warnings",
                youtubeUrl,
            ],
            { timeout: 30000 },
            (err, stdout) => {
                if (err) return reject(err);
                const url = stdout.trim().split("\n")[0];
                if (!url) return reject(new Error("yt-dlp returned empty URL"));
                resolve(url);
            }
        );
    });
}

function playLiveStream(
    conn: ReturnType<typeof getVoiceConnection>,
    streamUrl: string,
    controller: SleepcallController
): Promise<void> {
    return new Promise((resolve) => {
        const ffmpeg = spawn(
            ffmpegPath,
            [
                "-reconnect", "1",
                "-reconnect_streamed", "1",
                "-reconnect_delay_max", "5",
                "-i", streamUrl,
                "-vn",
                "-f", "s16le",
                "-ar", "48000",
                "-ac", "2",
                "pipe:1",
            ],
            { stdio: ["ignore", "pipe", "ignore"] }
        );

        const player = createAudioPlayer();
        const subscription = conn!.subscribe(player);
        const resource = createAudioResource((ffmpeg.stdout as any), {
            inputType: StreamType.Raw,
        });
        player.play(resource);

        let settled = false;
        const cleanup = () => {
            if (settled) return;
            settled = true;
            try { subscription?.unsubscribe(); } catch {}
            try { player.stop(); } catch {}
            try { ffmpeg.kill("SIGKILL"); } catch {}
        };

        const checkInterval = setInterval(() => {
            if (!controller.active) {
                clearInterval(checkInterval);
                cleanup();
                resolve();
            }
        }, 2000);

        player.on("error", () => {
            clearInterval(checkInterval);
            cleanup();
            resolve();
        });

        ffmpeg.on("close", () => {
            clearInterval(checkInterval);
            cleanup();
            resolve();
        });
    });
}

async function runSleepcallLoop(
    guildId: string,
    channelId: string,
    youtubeUrl: string,
    guild: Guild,
    controller: SleepcallController
): Promise<void> {
    while (controller.active) {
        try {
            let conn = getVoiceConnection(guildId, environment.botId);
            if (!conn) {
                const channel = guild.channels.cache.get(channelId) as any;
                if (!channel) {
                    logger.warn(guildId, "Sleepcall: channel not found, stopping");
                    controller.active = false;
                    break;
                }
                conn = await connectToChannel(channel) ?? undefined;
                if (!conn) {
                    logger.warn(guildId, "Sleepcall: cannot connect, retrying in 5s");
                    await sleep(5000);
                    continue;
                }
            }

            if (conn.state.status !== VoiceConnectionStatus.Ready) {
                try {
                    await entersState(conn, VoiceConnectionStatus.Ready, 10_000);
                } catch {
                    await sleep(3000);
                    continue;
                }
            }

            logger.info(guildId, `Sleepcall: fetching stream URL...`);
            const streamUrl = await getYtDlpUrl(youtubeUrl);
            logger.info(guildId, "Sleepcall: stream started");
            await playLiveStream(conn, streamUrl, controller);
            if (controller.active) {
                logger.info(guildId, "Sleepcall: stream ended, restarting in 3s...");
            }
        } catch (err: any) {
            logger.warn(guildId, `Sleepcall error: ${err?.message ?? err}`);
        }

        if (controller.active) {
            await sleep(3000);
        }
    }
    logger.info(guildId, "Sleepcall: loop stopped");
}

export function startSleepcall(
    guildId: string,
    channelId: string,
    youtubeUrl: string,
    guild: Guild
): void {
    stopSleepcall(guildId);
    const controller: SleepcallController = { active: true };
    activeSleepcalls.set(guildId, controller);
    runSleepcallLoop(guildId, channelId, youtubeUrl, guild, controller).catch((err) => {
        logger.error(guildId, `Sleepcall fatal: ${err}`);
    });
}

export function stopSleepcall(guildId: string): void {
    const controller = activeSleepcalls.get(guildId);
    if (controller) {
        controller.active = false;
        activeSleepcalls.delete(guildId);
    }
}

export function isSleepcallActive(guildId: string): boolean {
    return activeSleepcalls.has(guildId);
}
