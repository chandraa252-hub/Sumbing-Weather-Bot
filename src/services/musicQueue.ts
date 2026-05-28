import { execFile, spawn } from "child_process";
import {
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    StreamType,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import ffmpegStatic from "ffmpeg-static";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    TextChannel,
} from "discord.js";
import { client } from "../discord";
import { environment } from "../environment";
import { connectToChannel } from "../util/connectToChannel";
import logger from "./logger";
import { duckSleepcall, unduckSleepcall, isSleepcallActive } from "./sleepcall";
import { BUTTON_MUSIC_SKIP, BUTTON_MUSIC_STOP } from "../constants";

const ffmpegPath = (ffmpegStatic as any).default ?? ffmpegStatic;
const MAX_STREAM_RETRIES = 3;

export interface QueueItem {
    url: string;
    title: string;
}

/** How playStream ended. */
type PlayEndReason = "user" | "natural" | "error";

interface SongController {
    active: boolean;
}

interface MusicState {
    guildId: string;
    channelId: string;
    textChannelId: string;
    queue: QueueItem[];
    currentIndex: number;
    active: boolean;
    songController: SongController;
    volumeTransformer?: any;
    duckCount: number;
    statusChannelId?: string;
    statusMessageId?: string;
    /** True when TTS/soundboard is interrupting the current song. */
    interrupted: boolean;
    /** Resolves when TTS/soundboard finishes so music can resume. */
    resumePromise: Promise<void> | null;
    resumeResolve: (() => void) | null;
    /** How many consecutive stream errors for the current song. */
    streamRetries: number;
}

const activeQueues = new Map<string, MusicState>();

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function createMusicEmbed(state: Pick<MusicState, "queue" | "currentIndex">): EmbedBuilder {
    const current = state.queue[state.currentIndex];
    const next = state.queue[state.currentIndex + 1];
    const remaining = Math.max(0, state.queue.length - state.currentIndex - 1);
    return new EmbedBuilder()
        .setTitle(`🎵 ${current?.title ?? "—"}`)
        .setDescription(
            [
                next
                    ? `⏭ **Selanjutnya:** ${next.title}`
                    : `⏭ Tidak ada lagu berikutnya dalam antrian`,
                `📋 ${remaining} lagu dalam antrian`,
            ].join("\n")
        )
        .setColor(0x1db954);
}

export function createMusicButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_MUSIC_SKIP)
            .setLabel("⏭ Skip")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_MUSIC_STOP)
            .setLabel("⏹ Stop")
            .setStyle(ButtonStyle.Danger)
    );
}

async function editStatusMessage(state: MusicState, ended: boolean): Promise<void> {
    if (!state.statusChannelId || !state.statusMessageId) return;
    try {
        const channel = (await client.channels.fetch(state.statusChannelId)) as TextChannel;
        if (!channel?.isTextBased()) return;
        const msg = await channel.messages.fetch(state.statusMessageId);
        if (ended) {
            await msg.edit({ content: "⏹ Antrian musik selesai.", embeds: [], components: [] });
        } else {
            await msg.edit({
                embeds: [createMusicEmbed(state)],
                components: [createMusicButtons() as any],
            });
        }
    } catch {
        /* message deleted or not found */
    }
}

async function sendOrUpdateStatusMessage(state: MusicState): Promise<void> {
    if (state.statusChannelId && state.statusMessageId) {
        await editStatusMessage(state, false);
        return;
    }
    try {
        const channel = (await client.channels.fetch(state.textChannelId)) as TextChannel;
        if (!channel?.isTextBased()) return;
        const msg = await (channel as any).send({
            embeds: [createMusicEmbed(state)],
            components: [createMusicButtons()],
        });
        state.statusChannelId = state.textChannelId;
        state.statusMessageId = msg.id;
    } catch (err) {
        logger.warn(state.guildId, `MusicQueue: failed to send status message: ${err}`);
    }
}

export function getYtDlpTitle(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(
            "yt-dlp",
            [
                "--get-title",
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android,web",
                "--no-warnings",
                url,
            ],
            { timeout: 30000, windowsHide: true },
            (err, stdout) => {
                if (err) return reject(err);
                const title = stdout.trim().split("\n")[0];
                if (!title) return reject(new Error("yt-dlp returned empty title"));
                resolve(title);
            }
        );
    });
}

function getYtDlpStreamUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(
            "yt-dlp",
            [
                "-f", "bestaudio/best",
                "--get-url",
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android,web",
                "--no-warnings",
                url,
            ],
            { timeout: 30000, windowsHide: true },
            (err, stdout) => {
                if (err) return reject(err);
                const streamUrl = stdout.trim().split("\n")[0];
                if (!streamUrl) return reject(new Error("yt-dlp returned empty URL"));
                resolve(streamUrl);
            }
        );
    });
}

function playStream(
    conn: any,
    streamUrl: string,
    songCtrl: SongController,
    state: MusicState
): Promise<PlayEndReason> {
    return new Promise((resolve) => {
        const ffmpeg = spawn(
            ffmpegPath as string,
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
            { stdio: ["ignore", "pipe", "ignore"], windowsHide: true }
        );

        const player = createAudioPlayer();
        const subscription = conn.subscribe(player);
        const resource = createAudioResource(ffmpeg.stdout as any, {
            inputType: StreamType.Raw,
            inlineVolume: true,
        });

        state.volumeTransformer = resource.volume;
        if (state.duckCount > 0) resource.volume?.setVolume(0.15);

        player.play(resource);

        let settled = false;
        const cleanup = (reason: PlayEndReason) => {
            if (settled) return;
            settled = true;
            state.volumeTransformer = undefined;
            try { subscription?.unsubscribe(); } catch {}
            try { player.stop(); } catch {}
            try { ffmpeg.kill("SIGKILL"); } catch {}
            resolve(reason);
        };

        const checkInterval = setInterval(() => {
            if (!songCtrl.active || !state.active) {
                clearInterval(checkInterval);
                cleanup("user");
            }
        }, 500);

        player.on("error", (err: any) => {
            logger.warn(state.guildId, `MusicQueue player error: ${err?.message ?? err}`);
            clearInterval(checkInterval);
            cleanup("error");
        });

        ffmpeg.on("close", (code: number | null) => {
            clearInterval(checkInterval);
            // code 0 = natural end, non-zero or null = stream error
            cleanup(code === 0 ? "natural" : "error");
        });
    });
}

async function runQueue(guildId: string): Promise<void> {
    const state = activeQueues.get(guildId);
    if (!state) return;

    const sleepcallWasActive = isSleepcallActive(guildId);
    if (sleepcallWasActive) duckSleepcall(guildId);

    while (state.active && state.currentIndex < state.queue.length) {
        const item = state.queue[state.currentIndex];
        const songCtrl: SongController = { active: true };
        state.songController = songCtrl;

        await sendOrUpdateStatusMessage(state);

        let reason: PlayEndReason = "error";

        try {
            let conn = getVoiceConnection(guildId, environment.botId as any);
            if (!conn) {
                const guild = client.guilds.cache.get(guildId);
                const channel = guild?.channels.cache.get(state.channelId);
                if (channel) {
                    conn = (await connectToChannel(channel as any)) ?? undefined;
                }
            }
            if (!conn) {
                logger.warn(guildId, "MusicQueue: cannot connect to VC, stopping");
                state.active = false;
                break;
            }

            if (conn.state.status !== VoiceConnectionStatus.Ready) {
                try {
                    await entersState(conn, VoiceConnectionStatus.Ready, 10_000);
                } catch {
                    // Connection not ready, retry after delay
                    await sleep(3000);
                    continue;
                }
            }

            logger.info(guildId, `MusicQueue: [${state.currentIndex + 1}/${state.queue.length}] "${item.title}" (attempt ${state.streamRetries + 1})`);
            const streamUrl = await getYtDlpStreamUrl(item.url);
            reason = await playStream(conn as any, streamUrl, songCtrl, state);
        } catch (err) {
            logger.warn(guildId, `MusicQueue: error on "${item.title}": ${err}`);
            reason = "error";
        }

        if (!state.active) break;

        // TTS/soundboard interrupted this song — wait for it to finish, then replay
        if (state.interrupted) {
            logger.info(guildId, `MusicQueue: interrupted by TTS/soundboard, will resume "${item.title}"`);
            if (state.resumePromise) await state.resumePromise;
            state.interrupted = false;
            state.resumePromise = null;
            state.resumeResolve = null;
            state.streamRetries = 0;
            await sleep(300);
            continue; // Restart current song
        }

        // Stream dropped due to network/server error — retry
        if (reason === "error" && state.streamRetries < MAX_STREAM_RETRIES) {
            state.streamRetries++;
            logger.warn(guildId, `MusicQueue: stream error, retrying "${item.title}" (${state.streamRetries}/${MAX_STREAM_RETRIES})`);
            await sleep(2000);
            continue; // Retry current song
        }

        // Song ended (naturally, skipped by user, or max retries reached)
        state.streamRetries = 0;
        state.currentIndex++;
        await sleep(500);
    }

    const wasActive = state.active;
    state.active = false;
    activeQueues.delete(guildId);

    if (sleepcallWasActive) unduckSleepcall(guildId);
    if (wasActive) await editStatusMessage(state, true);

    logger.info(guildId, "MusicQueue: finished");
}

export function addToQueue(
    guildId: string,
    item: QueueItem,
    channelId: string,
    textChannelId: string
): void {
    let state = activeQueues.get(guildId);
    const wasRunning = state?.active ?? false;

    if (!state) {
        state = {
            guildId,
            channelId,
            textChannelId,
            queue: [],
            currentIndex: 0,
            active: false,
            songController: { active: false },
            duckCount: 0,
            interrupted: false,
            resumePromise: null,
            resumeResolve: null,
            streamRetries: 0,
        };
        activeQueues.set(guildId, state);
    }

    state.queue.push(item);

    if (!wasRunning) {
        state.active = true;
        state.currentIndex = 0;
        state.channelId = channelId;
        state.textChannelId = textChannelId;
        runQueue(guildId).catch((err) =>
            logger.error(guildId, `MusicQueue fatal: ${err}`)
        );
    } else {
        editStatusMessage(state, false).catch(() => {});
    }
}

export function skipCurrentSong(guildId: string): boolean {
    const state = activeQueues.get(guildId);
    if (!state || !state.active) return false;
    // Make sure this is not treated as a TTS interrupt
    state.interrupted = false;
    state.songController.active = false;
    return true;
}

export function stopMusicQueue(guildId: string): boolean {
    const state = activeQueues.get(guildId);
    if (!state) return false;
    state.active = false;
    state.interrupted = false;
    state.songController.active = false;
    // Unblock any waiting resumePromise
    const resolve = state.resumeResolve;
    state.resumeResolve = null;
    state.resumePromise = null;
    resolve?.();
    return true;
}

/**
 * Called by TTS/soundboard BEFORE they start playing.
 * Pauses the current music song so it doesn't fight for the voice connection.
 * Music will restart the current song once resumeMusicAfterInterrupt() is called.
 */
export function pauseMusicForInterrupt(guildId: string): boolean {
    const state = activeQueues.get(guildId);
    if (!state?.active) return false;
    state.interrupted = true;
    state.resumePromise = new Promise<void>((resolve) => {
        state.resumeResolve = resolve;
    });
    state.songController.active = false; // Signal playStream to stop
    return true;
}

/**
 * Called by TTS/soundboard AFTER they finish playing.
 * Signals the music queue to resume playing the current song.
 */
export function resumeMusicAfterInterrupt(guildId: string): void {
    const state = activeQueues.get(guildId);
    if (!state) return;
    const resolve = state.resumeResolve;
    state.resumeResolve = null;
    state.resumePromise = null;
    resolve?.();
}

export function isMusicActive(guildId: string): boolean {
    return (activeQueues.get(guildId)?.active) ?? false;
}

export function getMusicInfo(guildId: string): {
    current: QueueItem | undefined;
    next: QueueItem | undefined;
    total: number;
    remaining: number;
} | null {
    const state = activeQueues.get(guildId);
    if (!state) return null;
    return {
        current: state.queue[state.currentIndex],
        next: state.queue[state.currentIndex + 1],
        total: state.queue.length,
        remaining: Math.max(0, state.queue.length - state.currentIndex - 1),
    };
}

export function duckMusic(guildId: string): void {
    const state = activeQueues.get(guildId);
    if (!state) return;
    state.duckCount++;
    state.volumeTransformer?.setVolume(0.15);
}

export function unduckMusic(guildId: string): void {
    const state = activeQueues.get(guildId);
    if (!state) return;
    state.duckCount = Math.max(0, state.duckCount - 1);
    if (state.duckCount === 0) state.volumeTransformer?.setVolume(1);
}
