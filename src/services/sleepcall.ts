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
import { TextChannel } from "discord.js";
import { Guild } from "discord.js";
import logger from "./logger";
import { environment } from "../environment";
import { connectToChannel } from "../util/connectToChannel";
import { client } from "../discord";

const ffmpegPath: string = (ffmpegStatic as any).default ?? ffmpegStatic;

const MAX_CONSECUTIVE_FAILURES = 5;

const MILESTONES: { seconds: number; label: string }[] = [
    { seconds: 86400,     label: "1 hari" },
    { seconds: 172800,    label: "2 hari" },
    { seconds: 259200,    label: "3 hari" },
    { seconds: 432000,    label: "5 hari" },
    { seconds: 604800,    label: "1 minggu" },
    { seconds: 1209600,   label: "2 minggu" },
    { seconds: 1814400,   label: "3 minggu" },
    { seconds: 2592000,   label: "1 bulan" },
    { seconds: 5184000,   label: "2 bulan" },
    { seconds: 7776000,   label: "3 bulan" },
    { seconds: 10368000,  label: "4 bulan" },
    { seconds: 12960000,  label: "5 bulan" },
    { seconds: 15552000,  label: "6 bulan" },
    { seconds: 18144000,  label: "7 bulan" },
    { seconds: 20736000,  label: "8 bulan" },
    { seconds: 23328000,  label: "9 bulan" },
    { seconds: 25920000,  label: "10 bulan" },
    { seconds: 28512000,  label: "11 bulan" },
    { seconds: 31536000,  label: "1 tahun" },
    { seconds: 63072000,  label: "2 tahun" },
    { seconds: 94608000,  label: "3 tahun" },
    { seconds: 126144000, label: "4 tahun" },
    { seconds: 157680000, label: "5 tahun" },
];

interface SleepcallController {
    active: boolean;
    lastMilestoneIndex: number;
    milestoneTimer?: NodeJS.Timeout;
}

const activeSleepcalls = new Map<string, SleepcallController>();

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLastPassedMilestoneIndex(startTime: number): number {
    const elapsed = (Date.now() - startTime) / 1000;
    let lastIndex = -1;
    for (let i = 0; i < MILESTONES.length; i++) {
        if (elapsed >= MILESTONES[i].seconds) lastIndex = i;
        else break;
    }
    return lastIndex;
}

function startMilestoneChecker(
    guildId: string,
    textChannelId: string,
    startTime: number,
    controller: SleepcallController
): void {
    controller.milestoneTimer = setInterval(async () => {
        if (!controller.active) {
            clearInterval(controller.milestoneTimer);
            return;
        }
        const elapsed = (Date.now() - startTime) / 1000;
        let nextIndex = controller.lastMilestoneIndex + 1;
        while (nextIndex < MILESTONES.length && elapsed >= MILESTONES[nextIndex].seconds) {
            const milestone = MILESTONES[nextIndex];
            try {
                const channel = await client.channels.fetch(textChannelId);
                if (channel?.isTextBased()) {
                    await (channel as TextChannel).send(
                        `🎉 **Selamat!** Voice channel sudah berjalan selama **${milestone.label}** tanpa henti! 🏆`
                    );
                }
            } catch (err) {
                logger.warn(guildId, `Sleepcall: gagal kirim pesan milestone: ${err}`);
            }
            controller.lastMilestoneIndex = nextIndex;
            nextIndex++;
        }
    }, 60_000);
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
    let consecutiveFailures = 0;

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

            logger.info(guildId, "Sleepcall: fetching stream URL...");
            const streamUrl = await getYtDlpUrl(youtubeUrl);
            logger.info(guildId, "Sleepcall: stream started");
            await playLiveStream(conn, streamUrl, controller);

            consecutiveFailures = 0;

            if (controller.active) {
                logger.info(guildId, "Sleepcall: stream ended, restarting in 3s...");
            }
        } catch (err: any) {
            consecutiveFailures++;
            logger.warn(guildId, `Sleepcall error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${err?.message ?? err}`);
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                logger.warn(guildId, "Sleepcall: max failures reached, stopping automatically");
                controller.active = false;
                if (controller.milestoneTimer) clearInterval(controller.milestoneTimer);
                activeSleepcalls.delete(guildId);
                break;
            }
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
    guild: Guild,
    textChannelId: string,
    startTime: number
): void {
    stopSleepcall(guildId);
    const controller: SleepcallController = {
        active: true,
        lastMilestoneIndex: getLastPassedMilestoneIndex(startTime),
    };
    activeSleepcalls.set(guildId, controller);
    startMilestoneChecker(guildId, textChannelId, startTime, controller);
    runSleepcallLoop(guildId, channelId, youtubeUrl, guild, controller).catch((err) => {
        logger.error(guildId, `Sleepcall fatal: ${err}`);
    });
}

export function stopSleepcall(guildId: string): void {
    const controller = activeSleepcalls.get(guildId);
    if (controller) {
        controller.active = false;
        if (controller.milestoneTimer) clearInterval(controller.milestoneTimer);
        activeSleepcalls.delete(guildId);
    }
}

export function isSleepcallActive(guildId: string): boolean {
    return activeSleepcalls.has(guildId);
}
