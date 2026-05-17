"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUTTON_STOP = exports.BUTTON_SKIP = void 0;
exports.createStatusMessage = createStatusMessage;
exports.sendStatusMessage = sendStatusMessage;
exports.updateStatusMessage = updateStatusMessage;
exports.deleteStatusMessage = deleteStatusMessage;
const discord_js_1 = require("discord.js");
const constants_1 = require("../constants");
const discord_1 = require("../discord");
const persistence_1 = require("../persistence");
const persistence_2 = require("../persistence");
const emojis_1 = require("../util/emojis");
const time_1 = require("../util/time");
const weatherDisplay_1 = require("../util/weatherDisplay");
const logger_1 = __importDefault(require("./logger"));
const timer_1 = require("./timer");
exports.BUTTON_SKIP = "timer_skip";
exports.BUTTON_STOP = "timer_stop";
/** Discord collapses extra `\n` in embeds; braille blank lines keep visible vertical space. */
const BLANK_LINE = "\u2800";
/** Double gap between Next Weather and tips (2× a single blank line). */
const WEATHER_TO_TIPS_GAP = `${BLANK_LINE}\n${BLANK_LINE}`;
const STATUS_TIPS = [
    "⚠️ Stay prepared for sudden weather changes. ⚠️",
    "Be careful during thunderstorm weather.",
    "",
    "☕ STMJ is recommended during nighttime weather.",
    "STMJ effect duration: 5 minutes.",
    "",
    "🪨 In Watu Kotak, STMJ + Torch is required",
    "during Extreme Weather between 02:00 - 04:00.",
].join("\n");
function createTimerButtons() {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(exports.BUTTON_SKIP)
        .setLabel(`${emojis_1.EMOJI_SKIP} Next weather`)
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId(exports.BUTTON_STOP)
        .setLabel(`${emojis_1.EMOJI_STOP} Stop timer`)
        .setStyle(discord_js_1.ButtonStyle.Danger));
}
function buildCurrentWeatherSection(config, timer) {
    const currentWeather = config.athletes[timer.currentAthleteIndex];
    const weatherLine = (0, weatherDisplay_1.formatWeatherLine)(currentWeather);
    if (timer.started) {
        const remainingSeconds = timer.nextChangeTime - (0, time_1.getTime)();
        return [`# Current Weather`, `# ${weatherLine} (${(0, weatherDisplay_1.formatRemainingDuration)(remainingSeconds)} remaining)`].join("\n");
    }
    return [
        `# Current Weather`,
        `# ${(0, weatherDisplay_1.getWeatherEmoji)(currentWeather.name)} ${(0, weatherDisplay_1.formatWeatherName)(currentWeather.name)} (starts <t:${timer.nextChangeTime}:R>)`,
    ].join("\n");
}
function buildNextWeatherSection(config, timer) {
    const nextWeather = config.athletes[(0, timer_1.getNextAthleteIndex)(config, timer)];
    return [`## Next Weather`, `### ${(0, weatherDisplay_1.formatWeatherLine)(nextWeather)}`].join("\n");
}
/** Discord subtext (`-#`) — smallest size available in embeds. */
function buildControlsSection() {
    return [
        `-# Controls:`,
        `-# ${emojis_1.EMOJI_SKIP} Skip to advance when weather changes to normal or dry conditions`,
        `-# ${emojis_1.EMOJI_STOP} Stop the weather timer or use \`/${constants_1.SLASH_COMMAND.name} stop\``,
    ].join("\n");
}
function buildStatusDescription(config, timer) {
    return [
        buildCurrentWeatherSection(config, timer),
        buildNextWeatherSection(config, timer),
        WEATHER_TO_TIPS_GAP,
        STATUS_TIPS,
        buildControlsSection(),
    ].join("\n\n");
}
function createStatusMessage(config, timer) {
    return new discord_js_1.EmbedBuilder().setDescription(buildStatusDescription(config, timer));
}
async function sendStatusMessage(channel, _scope) {
    const guildId = channel.guild.id;
    const [config, timer] = await Promise.all([persistence_1.configRepo.get(guildId), persistence_2.timerRepo.get(guildId)]);
    if (timer === undefined) {
        return;
    }
    let message;
    try {
        message = await channel.send({
            embeds: [createStatusMessage(config, timer)],
            components: [createTimerButtons()],
        });
        await persistence_2.timerRepo.update(guildId, (t) => ({
            ...t,
            status: {
                channelId: channel.id,
                messageId: message.id,
            },
        }));
    }
    catch (e) {
        logger_1.default.warn(guildId, "Could not send status message");
    }
}
async function updateStatusMessage(guildId, _scope) {
    const [config, timer] = await Promise.all([persistence_1.configRepo.get(guildId), persistence_2.timerRepo.get(guildId)]);
    if (timer?.status === undefined) {
        return;
    }
    try {
        const channel = (await discord_1.client.channels.fetch(timer.status.channelId));
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.edit({
            embeds: [createStatusMessage(config, timer)],
            components: [createTimerButtons()],
        });
    }
    catch (e) {
        logger_1.default.warn(guildId, "Could not update status message");
        await persistence_2.timerRepo.update(timer.guildId, (t) => ({
            ...t,
            status: undefined,
        }));
    }
}
async function deleteStatusMessage(guildId, _scope) {
    const timer = await persistence_2.timerRepo.get(guildId);
    if (timer?.status === undefined) {
        return;
    }
    try {
        const channel = (await discord_1.client.channels.fetch(timer.status.channelId));
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.delete();
    }
    catch (e) {
        logger_1.default.warn(guildId, "Could not delete status message");
    }
}
