"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTimerLoop = startTimerLoop;
const node_1 = require("@sentry/node");
const perf_hooks_1 = require("perf_hooks");
const constants_1 = require("./constants");
const discord_1 = require("./discord");
const persistence_1 = require("./persistence");
const persistence_2 = require("./persistence");
const logger_1 = __importDefault(require("./services/logger"));
const permissions_1 = require("./services/permissions");
const statusMessage_1 = require("./services/statusMessage");
const timer_1 = require("./services/timer");
const speak_1 = require("./speak");
const getVoiceConnection_1 = require("./util/getVoiceConnection");
const time_1 = require("./util/time");
const INTERVAL = 1_000;
let timerLoopStart;
function startTimerLoop() {
    logger_1.default.info(undefined, "Starting timer loop");
    timerLoopStart = perf_hooks_1.performance.now();
    scheduleTick();
}
/**
 * @source: https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
 */
async function scheduleTick() {
    await tick();
    const now = perf_hooks_1.performance.now();
    const elapsed = now - timerLoopStart;
    const roundedElapsed = Math.round(elapsed / INTERVAL) * INTERVAL;
    const targetNext = timerLoopStart + roundedElapsed + INTERVAL;
    const delay = targetNext - perf_hooks_1.performance.now();
    setTimeout(scheduleTick, delay);
}
let prevTickTime;
async function tick() {
    const time = (0, time_1.getTime)();
    if (time !== prevTickTime) {
        const timers = await persistence_2.timerRepo.getAll();
        timers.filter((timer) => timer !== undefined).forEach((timer) => tickTimer(timer, time));
    }
    prevTickTime = time;
}
/**
 * - Do not await `speakCommand`
 */
async function tickTimer(timer, now) {
    const scope = new node_1.Scope();
    scope.setTag("handler", "timer");
    try {
        const config = await persistence_1.configRepo.get(timer.guildId);
        const nextAthleteIndex = (0, timer_1.getNextAthleteIndex)(config, timer);
        const nextAthleteName = config.athletes[nextAthleteIndex].name;
        const remainingSeconds = Math.max(timer.nextChangeTime - now, 0);
        if (remainingSeconds === 0) {
            await persistence_2.timerRepo.update(timer.guildId, (t) => ({
                ...t,
                currentAthleteIndex: nextAthleteIndex,
                nextChangeTime: now + config.athletes[nextAthleteIndex].time,
                started: true,
            }));
        }
        if (timer.status && timer.started) {
            await (0, statusMessage_1.updateStatusMessage)(timer.guildId, scope);
        }
        // Voice is optional — failure here must NOT kill the timer or the countdown
        let connection;
        try {
            connection = await (0, getVoiceConnection_1.getVoiceConnection)(config);
            if (!connection || !connection.joinConfig.channelId) {
                return;
            }
            const voiceChannel = (await discord_1.client.channels.fetch(connection.joinConfig.channelId));
            if (!voiceChannel) {
                return;
            }
            const guild = await discord_1.client.guilds.fetch(timer.guildId);
            if (!(0, permissions_1.hasVoicePermissions)(guild)) {
                return;
            }
            const isVoiceChannelEmpty = voiceChannel.members.filter((member) => member.id !== discord_1.client.user.id).size === 0;
            if (isVoiceChannelEmpty) {
                if (timer.voiceChannelEmptySince) {
                    if (timer.voiceChannelEmptySince <= now - constants_1.EMPTY_VC_TIMEOUT) {
                        logger_1.default.info(timer.guildId, "Stopping timer due to an empty voice channel");
                        await (0, timer_1.stopTimer)(timer.guildId, scope);
                        connection.destroy();
                        return;
                    }
                }
                else {
                    logger_1.default.info(timer.guildId, "Empty voice channel");
                    await persistence_2.timerRepo.update(timer.guildId, (t) => ({ ...t, voiceChannelEmptySince: now }));
                }
            }
            else if (timer.voiceChannelEmptySince) {
                await persistence_2.timerRepo.update(timer.guildId, (t) => ({ ...t, voiceChannelEmptySince: undefined }));
            }
            await (0, speak_1.speakCommand)(remainingSeconds.toString(), { nextAthlete: nextAthleteName, started: timer.started }, connection, config.languageKey);
        }
        catch (voiceError) {
            logger_1.default.warn(timer.guildId, `Voice error (timer continues): ${voiceError}`);
        }
    }
    catch (e) {
        logger_1.default.error(timer.guildId, new Error(`Stopping timer due to an error\n${e}`), scope);
        await persistence_2.timerRepo.remove(timer.guildId);
    }
}
