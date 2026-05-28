"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MILESTONES = void 0;
exports.startSleepcall = startSleepcall;
exports.stopSleepcall = stopSleepcall;
exports.isSleepcallActive = isSleepcallActive;
exports.getYtDlpTitle = getYtDlpTitle;
exports.formatDuration = formatDuration;
exports.getNextMilestoneText = getNextMilestoneText;
exports.duckSleepcall = duckSleepcall;
exports.unduckSleepcall = unduckSleepcall;

const { execFile, spawn } = require("child_process");
const voice_1 = require("@discordjs/voice");
const ffmpegStatic = require("ffmpeg-static");
const logger_1 = require("./logger");
const environment_1 = require("../environment");
const connectToChannel_1 = require("../util/connectToChannel");
const discord_1 = require("../discord");

const ffmpegPath = ffmpegStatic.default ?? ffmpegStatic;
const MAX_CONSECUTIVE_FAILURES = 5;
const DUCK_VOLUME = 0.15;

const MILESTONES = [
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
exports.MILESTONES = MILESTONES;

const activeSleepcalls = new Map();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} detik`);
    return parts.join(" ");
}

function getNextMilestoneText(startTime) {
    const elapsed = (Date.now() - startTime) / 1000;
    for (const m of MILESTONES) {
        if (elapsed < m.seconds) {
            const remaining = (m.seconds - elapsed) * 1000;
            return `**${m.label}** (${formatDuration(remaining)} lagi)`;
        }
    }
    return "Sudah melewati semua milestone! 🎉";
}

function getLastPassedMilestoneIndex(startTime) {
    const elapsed = (Date.now() - startTime) / 1000;
    let lastIndex = -1;
    for (let i = 0; i < MILESTONES.length; i++) {
        if (elapsed >= MILESTONES[i].seconds) lastIndex = i;
        else break;
    }
    return lastIndex;
}

function startMilestoneChecker(guildId, textChannelId, startTime, controller) {
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
                const channel = await discord_1.client.channels.fetch(textChannelId);
                if (channel?.isTextBased()) {
                    await channel.send(`🎉 **Selamat!** Voice channel sudah berjalan selama **${milestone.label}** tanpa henti! 🏆`);
                }
            } catch (err) {
                const log = logger_1.default ?? logger_1;
                log.warn(guildId, `Sleepcall: gagal kirim pesan milestone: ${err}`);
            }
            controller.lastMilestoneIndex = nextIndex;
            nextIndex++;
        }
    }, 60_000);
}

function getYtDlpTitle(youtubeUrl) {
    return new Promise((resolve, reject) => {
        execFile(
            "yt-dlp",
            [
                "--get-title",
                "--no-playlist",
                "--extractor-args", "youtube:player_client=android,web",
                "--no-warnings",
                youtubeUrl,
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

function getYtDlpUrl(youtubeUrl) {
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
            { timeout: 30000, windowsHide: true },
            (err, stdout) => {
                if (err) return reject(err);
                const url = stdout.trim().split("\n")[0];
                if (!url) return reject(new Error("yt-dlp returned empty URL"));
                resolve(url);
            }
        );
    });
}

function playLiveStream(conn, streamUrl, controller) {
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

        controller.volumeTransformer = resource.volume;
        if (controller.duckCount > 0) {
            resource.volume?.setVolume(DUCK_VOLUME);
        }

        player.play(resource);

        let settled = false;
        const cleanup = () => {
            if (settled) return;
            settled = true;
            controller.volumeTransformer = undefined;
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

async function runSleepcallLoop(guildId, channelId, youtubeUrl, guild, controller) {
    const log = logger_1.default ?? logger_1;
    let consecutiveFailures = 0;

    while (controller.active) {
        try {
            let conn = (0, voice_1.getVoiceConnection)(guildId, environment_1.environment.botId);
            if (!conn) {
                const channel = guild.channels.cache.get(channelId);
                if (!channel) {
                    log.warn(guildId, "Sleepcall: channel not found, stopping");
                    controller.active = false;
                    break;
                }
                conn = await (0, connectToChannel_1.connectToChannel)(channel);
                if (!conn) {
                    log.warn(guildId, "Sleepcall: cannot connect, retrying in 5s");
                    await sleep(5000);
                    continue;
                }
            }

            if (conn.state.status !== voice_1.VoiceConnectionStatus.Ready) {
                try {
                    await (0, voice_1.entersState)(conn, voice_1.VoiceConnectionStatus.Ready, 10_000);
                } catch {
                    await sleep(3000);
                    continue;
                }
            }

            log.info(guildId, "Sleepcall: fetching stream URL...");
            const streamUrl = await getYtDlpUrl(youtubeUrl);
            log.info(guildId, "Sleepcall: stream started");
            await playLiveStream(conn, streamUrl, controller);

            consecutiveFailures = 0;

            if (controller.active) {
                log.info(guildId, "Sleepcall: stream ended, restarting in 3s...");
            }
        } catch (err) {
            consecutiveFailures++;
            log.warn(guildId, `Sleepcall error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${err?.message ?? err}`);
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                log.warn(guildId, "Sleepcall: max failures reached, stopping automatically");
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
    log.info(guildId, "Sleepcall: loop stopped");
}

function startSleepcall(guildId, channelId, youtubeUrl, guild, textChannelId, startTime) {
    stopSleepcall(guildId);
    const controller = {
        active: true,
        lastMilestoneIndex: getLastPassedMilestoneIndex(startTime),
        duckCount: 0,
    };
    activeSleepcalls.set(guildId, controller);
    startMilestoneChecker(guildId, textChannelId, startTime, controller);
    runSleepcallLoop(guildId, channelId, youtubeUrl, guild, controller).catch((err) => {
        const log = logger_1.default ?? logger_1;
        log.error(guildId, `Sleepcall fatal: ${err}`);
    });
}

function stopSleepcall(guildId) {
    const controller = activeSleepcalls.get(guildId);
    if (controller) {
        controller.active = false;
        if (controller.milestoneTimer) clearInterval(controller.milestoneTimer);
        activeSleepcalls.delete(guildId);
    }
}

function isSleepcallActive(guildId) {
    return activeSleepcalls.has(guildId);
}

function duckSleepcall(guildId) {
    const controller = activeSleepcalls.get(guildId);
    if (!controller) return;
    controller.duckCount++;
    controller.volumeTransformer?.setVolume(DUCK_VOLUME);
}

function unduckSleepcall(guildId) {
    const controller = activeSleepcalls.get(guildId);
    if (!controller) return;
    controller.duckCount = Math.max(0, controller.duckCount - 1);
    if (controller.duckCount === 0) {
        controller.volumeTransformer?.setVolume(1);
    }
}
