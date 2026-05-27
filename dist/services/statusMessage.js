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
/** Single gap between Next Weather and tips. */
const WEATHER_TO_TIPS_GAP = `${BLANK_LINE}`;
function getStatusTips(languageKey) {
    if (languageKey === "id") {
        return [
            "⚠️ Bersiaplah menghadapi perubahan cuaca mendadak.",
            "Berhati-hati saat cuaca badai petir.",
            BLANK_LINE,
            "☕ STMJ dianjurkan saat cuaca malam hari.",
            "Durasi efek STMJ: 5 menit.",
            BLANK_LINE,
            "🪨 Di Watu Kotak, STMJ + Obor diperlukan",
            "saat Cuaca Buruk antara pukul 02:00 - 04:00.",
        ].join("\n");
    }
    return [
        "⚠️ Stay prepared for sudden weather changes.",
        "Be careful during thunderstorm weather.",
        BLANK_LINE,
        "☕ STMJ is recommended during nighttime weather.",
        "STMJ effect duration: 5 minutes.",
        BLANK_LINE,
        "🪨 In Watu Kotak, STMJ + Torch is required",
        "during Extreme Weather between 02:00 - 04:00.",
    ].join("\n");
}
function createTimerButtons(languageKey) {
    const skipLabel = languageKey === "id" ? `${emojis_1.EMOJI_SKIP} Ganti cuaca` : `${emojis_1.EMOJI_SKIP} Next weather`;
    const stopLabel = languageKey === "id" ? `${emojis_1.EMOJI_STOP} Berhenti` : `${emojis_1.EMOJI_STOP} Stop timer`;
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(exports.BUTTON_SKIP)
        .setLabel(skipLabel)
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId(exports.BUTTON_STOP)
        .setLabel(stopLabel)
        .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
        .setCustomId(constants_1.BUTTON_SOUNDBOARD_OPEN)
        .setLabel("🎵 Soundboard")
        .setStyle(discord_js_1.ButtonStyle.Secondary));
}
function buildCurrentWeatherSection(config, timer) {
    const currentWeather = config.athletes[timer.currentAthleteIndex];
    const weatherLine = (0, weatherDisplay_1.formatWeatherLine)(currentWeather);
    const header = config.languageKey === "id" ? "# Cuaca Saat Ini" : "# Current Weather";
    if (timer.started) {
        const remainingSeconds = timer.nextChangeTime - (0, time_1.getTime)();
        const remainingLabel = config.languageKey === "id"
            ? `(${(0, weatherDisplay_1.formatRemainingDuration)(remainingSeconds)} lagi)`
            : `(${(0, weatherDisplay_1.formatRemainingDuration)(remainingSeconds)} remaining)`;
        return [header, `# ${weatherLine}`, `# ${remainingLabel}`].join("\n");
    }
    const startsLabel = config.languageKey === "id"
        ? `(dimulai <t:${timer.nextChangeTime}:R>)`
        : `(starts <t:${timer.nextChangeTime}:R>)`;
    return [
        header,
        `# ${(0, weatherDisplay_1.getWeatherEmoji)(currentWeather.name)} ${(0, weatherDisplay_1.formatWeatherName)(currentWeather.name)}`,
        `# ${startsLabel}`,
    ].join("\n");
}
function buildNextWeatherSection(config, timer) {
    const nextWeather = config.athletes[(0, timer_1.getNextAthleteIndex)(config, timer)];
    const header = config.languageKey === "id" ? "## Cuaca Selanjutnya" : "## Next Weather";
    return [header, `### ${(0, weatherDisplay_1.formatWeatherLine)(nextWeather)}`].join("\n");
}
/** Discord subtext (`-#`) — smallest size available in embeds. */
function buildControlsSection(config) {
    if (config.languageKey === "id") {
        return [
            `-# Kontrol:`,
            `-# ${emojis_1.EMOJI_SKIP} Ganti saat cuaca berubah ke kondisi cerah atau kemarau`,
            `-# ${emojis_1.EMOJI_STOP} Hentikan timer cuaca atau gunakan \`/${constants_1.SLASH_COMMAND.commands.stop}\``,
        ].join("\n");
    }
    return [
        `-# Controls:`,
        `-# ${emojis_1.EMOJI_SKIP} Skip to advance when weather changes to normal or dry conditions`,
        `-# ${emojis_1.EMOJI_STOP} Stop the weather timer or use \`/${constants_1.SLASH_COMMAND.commands.stop}\``,
    ].join("\n");
}
function buildStatusDescription(config, timer) {
    return [
        buildCurrentWeatherSection(config, timer),
        buildNextWeatherSection(config, timer),
        WEATHER_TO_TIPS_GAP,
        getStatusTips(config.languageKey),
        buildControlsSection(config),
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
            components: [createTimerButtons(config.languageKey)],
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
            components: [createTimerButtons(config.languageKey)],
        });
    }
    catch (e) {
        // Only clear the status reference if the message/channel was genuinely deleted.
        // For transient errors (rate limits, network blips) keep the reference so we retry next tick.
        const UNKNOWN_MESSAGE = 10008;
        const UNKNOWN_CHANNEL = 10003;
        const isGone = e?.code === UNKNOWN_MESSAGE || e?.code === UNKNOWN_CHANNEL;
        if (isGone) {
            logger_1.default.warn(guildId, "Status message was deleted, clearing reference");
            await persistence_2.timerRepo.update(timer.guildId, (t) => ({
                ...t,
                status: undefined,
            }));
        }
        else {
            logger_1.default.warn(guildId, `Could not update status message (will retry): ${e?.message ?? e}`);
        }
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
