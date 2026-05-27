"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSleepcall = startSleepcall;
exports.stopSleepcall = stopSleepcall;
exports.isSleepcallActive = isSleepcallActive;

const { execFile, spawn } = require("child_process");
const voice_1 = require("@discordjs/voice");
const ffmpegStatic = require("ffmpeg-static");
const logger_1 = require("./logger");
const environment_1 = require("../environment");
const connectToChannel_1 = require("../util/connectToChannel");

const ffmpegPath = ffmpegStatic.default ?? ffmpegStatic;

// In-memory controller map: guildId -> { active: boolean }
const activeSleepcalls = new Map();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
            { stdio: ["ignore", "pipe", "ignore"] }
        );

        const player = (0, voice_1.createAudioPlayer)();
        const subscription = conn.subscribe(player);
        const resource = (0, voice_1.createAudioResource)(ffmpeg.stdout, {
            inputType: voice_1.StreamType.Raw,
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

async function runSleepcallLoop(guildId, channelId, youtubeUrl, guild, controller) {
    const log = logger_1.default ?? logger_1;
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

            log.info(guildId, `Sleepcall: fetching stream URL...`);
            const streamUrl = await getYtDlpUrl(youtubeUrl);
            log.info(guildId, "Sleepcall: stream started");
            await playLiveStream(conn, streamUrl, controller);
            if (controller.active) {
                log.info(guildId, "Sleepcall: stream ended, restarting in 3s...");
            }
        } catch (err) {
            const log2 = logger_1.default ?? logger_1;
            log2.warn(guildId, `Sleepcall error: ${err?.message ?? err}`);
        }

        if (controller.active) {
            await sleep(3000);
        }
    }
    const logEnd = logger_1.default ?? logger_1;
    logEnd.info(guildId, "Sleepcall: loop stopped");
}

function startSleepcall(guildId, channelId, youtubeUrl, guild) {
    stopSleepcall(guildId);
    const controller = { active: true };
    activeSleepcalls.set(guildId, controller);
    runSleepcallLoop(guildId, channelId, youtubeUrl, guild, controller).catch((err) => {
        const log = logger_1.default ?? logger_1;
        log.error(guildId, `Sleepcall fatal: ${err}`);
    });
}

function stopSleepcall(guildId) {
    const controller = activeSleepcalls.get(guildId);
    if (controller) {
        controller.active = false;
        activeSleepcalls.delete(guildId);
    }
}

function isSleepcallActive(guildId) {
    return activeSleepcalls.has(guildId);
}
