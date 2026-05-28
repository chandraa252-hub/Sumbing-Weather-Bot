"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToQueue = addToQueue;
exports.skipCurrentSong = skipCurrentSong;
exports.stopMusicQueue = stopMusicQueue;
exports.isMusicActive = isMusicActive;
exports.getMusicInfo = getMusicInfo;
exports.setMusicStatusMessage = setMusicStatusMessage;
exports.duckMusic = duckMusic;
exports.unduckMusic = unduckMusic;
exports.getYtDlpTitle = getYtDlpTitle;
exports.createMusicEmbed = createMusicEmbed;
exports.createMusicButtons = createMusicButtons;

const { execFile, spawn } = require("child_process");
const voice_1 = require("@discordjs/voice");
const ffmpegStatic = require("ffmpeg-static");
const discord_js_1 = require("discord.js");
const discord_1 = require("../discord");
const environment_1 = require("../environment");
const connectToChannel_1 = require("../util/connectToChannel");
const logger_1 = require("./logger");
const sleepcall_1 = require("./sleepcall");
const constants_1 = require("../constants");

const ffmpegPath = ffmpegStatic.default ?? ffmpegStatic;
const activeQueues = new Map();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMusicEmbed(state) {
    const current = state.queue[state.currentIndex];
    const next = state.queue[state.currentIndex + 1];
    const remaining = Math.max(0, state.queue.length - state.currentIndex - 1);
    return new discord_js_1.EmbedBuilder()
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

function createMusicButtons() {
    return new discord_js_1.ActionRowBuilder().addComponents(
        new discord_js_1.ButtonBuilder()
            .setCustomId(constants_1.BUTTON_MUSIC_SKIP)
            .setLabel("⏭ Skip")
            .setStyle(discord_js_1.ButtonStyle.Primary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(constants_1.BUTTON_MUSIC_STOP)
            .setLabel("⏹ Stop")
            .setStyle(discord_js_1.ButtonStyle.Danger)
    );
}

async function editStatusMessage(state, ended) {
    if (!state.statusChannelId || !state.statusMessageId) return;
    try {
        const channel = await discord_1.client.channels.fetch(state.statusChannelId);
        if (!channel?.isTextBased()) return;
        const msg = await channel.messages.fetch(state.statusMessageId);
        if (ended) {
            await msg.edit({ content: "⏹ Antrian musik selesai.", embeds: [], components: [] });
        } else {
            await msg.edit({ embeds: [createMusicEmbed(state)], components: [createMusicButtons()] });
        }
    } catch {
        /* message deleted or not found */
    }
}

async function sendOrUpdateStatusMessage(state) {
    if (state.statusChannelId && state.statusMessageId) {
        await editStatusMessage(state, false);
        return;
    }
    try {
        const channel = await discord_1.client.channels.fetch(state.textChannelId);
        if (!channel?.isTextBased()) return;
        const msg = await channel.send({
            embeds: [createMusicEmbed(state)],
            components: [createMusicButtons()],
        });
        state.statusChannelId = state.textChannelId;
        state.statusMessageId = msg.id;
    } catch (err) {
        const log = logger_1.default ?? logger_1;
        log.warn(state.guildId, `MusicQueue: failed to send status message: ${err}`);
    }
}

function getYtDlpTitle(url) {
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

function getYtDlpStreamUrl(url) {
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

function playStream(conn, streamUrl, songCtrl, state) {
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
            { stdio: ["ignore", "pipe", "ignore"], windowsHide: true }
        );

        const player = (0, voice_1.createAudioPlayer)();
        const subscription = conn.subscribe(player);
        const resource = (0, voice_1.createAudioResource)(ffmpeg.stdout, {
            inputType: voice_1.StreamType.Raw,
            inlineVolume: true,
        });

        state.volumeTransformer = resource.volume;
        if (state.duckCount > 0) resource.volume?.setVolume(0.15);

        player.play(resource);

        let settled = false;
        const cleanup = () => {
            if (settled) return;
            settled = true;
            state.volumeTransformer = undefined;
            try { subscription?.unsubscribe(); } catch {}
            try { player.stop(); } catch {}
            try { ffmpeg.kill("SIGKILL"); } catch {}
        };

        const checkInterval = setInterval(() => {
            if (!songCtrl.active || !state.active) {
                clearInterval(checkInterval);
                cleanup();
                resolve();
            }
        }, 1000);

        player.on("error", () => { clearInterval(checkInterval); cleanup(); resolve(); });
        ffmpeg.on("close", () => { clearInterval(checkInterval); cleanup(); resolve(); });
    });
}

async function runQueue(guildId) {
    const state = activeQueues.get(guildId);
    if (!state) return;

    const log = logger_1.default ?? logger_1;
    const sleepcallWasActive = (0, sleepcall_1.isSleepcallActive)(guildId);
    if (sleepcallWasActive) (0, sleepcall_1.duckSleepcall)(guildId);

    while (state.active && state.currentIndex < state.queue.length) {
        const item = state.queue[state.currentIndex];
        const songCtrl = { active: true };
        state.songController = songCtrl;

        await sendOrUpdateStatusMessage(state);

        try {
            let conn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
            if (!conn) {
                const guild = discord_1.client.guilds.cache.get(guildId);
                const channel = guild?.channels.cache.get(state.channelId);
                if (channel) {
                    conn = await (0, connectToChannel_1.connectToChannel)(channel) ?? undefined;
                }
            }
            if (!conn) {
                log.warn(guildId, "MusicQueue: cannot connect to VC, stopping");
                state.active = false;
                break;
            }

            if (conn.state.status !== voice_1.VoiceConnectionStatus.Ready) {
                try {
                    await (0, voice_1.entersState)(conn, voice_1.VoiceConnectionStatus.Ready, 10_000);
                } catch {
                    state.currentIndex++;
                    continue;
                }
            }

            log.info(guildId, `MusicQueue: [${state.currentIndex + 1}/${state.queue.length}] "${item.title}"`);
            const streamUrl = await getYtDlpStreamUrl(item.url);
            await playStream(conn, streamUrl, songCtrl, state);
        } catch (err) {
            log.warn(guildId, `MusicQueue: error on "${item.title}": ${err}`);
        }

        if (!state.active) break;
        state.currentIndex++;
        await sleep(500);
    }

    const wasActive = state.active;
    state.active = false;
    activeQueues.delete(guildId);

    if (sleepcallWasActive) (0, sleepcall_1.unduckSleepcall)(guildId);
    if (wasActive) await editStatusMessage(state, true);

    (logger_1.default ?? logger_1).info(guildId, "MusicQueue: finished");
}

function addToQueue(guildId, item, channelId, textChannelId) {
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
            (logger_1.default ?? logger_1).error(guildId, `MusicQueue fatal: ${err}`)
        );
    } else {
        editStatusMessage(state, false).catch(() => {});
    }
}

function skipCurrentSong(guildId) {
    const state = activeQueues.get(guildId);
    if (!state || !state.active) return false;
    state.songController.active = false;
    return true;
}

function stopMusicQueue(guildId) {
    const state = activeQueues.get(guildId);
    if (!state) return false;
    state.active = false;
    state.songController.active = false;
    return true;
}

function isMusicActive(guildId) {
    return activeQueues.get(guildId)?.active ?? false;
}

function getMusicInfo(guildId) {
    const state = activeQueues.get(guildId);
    if (!state) return null;
    return {
        current: state.queue[state.currentIndex],
        next: state.queue[state.currentIndex + 1],
        total: state.queue.length,
        remaining: Math.max(0, state.queue.length - state.currentIndex - 1),
    };
}

function setMusicStatusMessage(guildId, channelId, messageId) {
    const state = activeQueues.get(guildId);
    if (!state) return;
    state.statusChannelId = channelId;
    state.statusMessageId = messageId;
}

function duckMusic(guildId) {
    const state = activeQueues.get(guildId);
    if (!state) return;
    state.duckCount++;
    state.volumeTransformer?.setVolume(0.15);
}

function unduckMusic(guildId) {
    const state = activeQueues.get(guildId);
    if (!state) return;
    state.duckCount = Math.max(0, state.duckCount - 1);
    if (state.duckCount === 0) state.volumeTransformer?.setVolume(1);
}
