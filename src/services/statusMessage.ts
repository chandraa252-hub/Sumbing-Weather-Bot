import { type Scope } from "@sentry/node";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from "discord.js";
import { SLASH_COMMAND } from "../constants";
import { client } from "../discord";
import { configRepo } from "../persistence";
import { timerRepo } from "../persistence";
import type { Config, Timer } from "../types";
import { EMOJI_SKIP, EMOJI_STOP } from "../util/emojis";
import { getTime } from "../util/time";
import {
    formatRemainingDuration,
    formatWeatherLine,
    formatWeatherName,
    getWeatherEmoji,
} from "../util/weatherDisplay";
import logger from "./logger";
import { getNextAthleteIndex } from "./timer";

export const BUTTON_SKIP = "timer_skip";
export const BUTTON_STOP = "timer_stop";

/** Discord collapses extra `\n` in embeds; braille blank lines keep visible vertical space. */
const BLANK_LINE = "\u2800";
/** Single gap between Next Weather and tips. */
const WEATHER_TO_TIPS_GAP = `${BLANK_LINE}`;

function getStatusTips(languageKey: string): string {
    if (languageKey === "id") {
        return [
            "⚠️ Bersiaplah menghadapi perubahan cuaca mendadak.",
            "Berhati-hati saat cuaca badai petir.",
            "☕ STMJ dianjurkan saat cuaca malam hari.",
            "Durasi efek STMJ: 5 menit.",
            "🪨 Di Watu Kotak, STMJ + Obor diperlukan",
            "saat Cuaca Buruk antara pukul 02:00 - 04:00.",
        ].join("\n");
    }
    return [
        "⚠️ Stay prepared for sudden weather changes.",
        "Be careful during thunderstorm weather.",
        "☕ STMJ is recommended during nighttime weather.",
        "STMJ effect duration: 5 minutes.",
        "🪨 In Watu Kotak, STMJ + Torch is required",
        "during Extreme Weather between 02:00 - 04:00.",
    ].join("\n");
}

function createTimerButtons(languageKey: string): ActionRowBuilder<ButtonBuilder> {
    const skipLabel = languageKey === "id" ? `${EMOJI_SKIP} Ganti cuaca` : `${EMOJI_SKIP} Next weather`;
    const stopLabel = languageKey === "id" ? `${EMOJI_STOP} Berhenti` : `${EMOJI_STOP} Stop timer`;
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_SKIP)
            .setLabel(skipLabel)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_STOP)
            .setLabel(stopLabel)
            .setStyle(ButtonStyle.Danger),
    );
}

function buildCurrentWeatherSection(config: Config, timer: Timer): string {
    const currentWeather = config.athletes[timer.currentAthleteIndex];
    const weatherLine = formatWeatherLine(currentWeather);

    const header = config.languageKey === "id" ? "# Cuaca Saat Ini" : "# Current Weather";
    if (timer.started) {
        const remainingSeconds = timer.nextChangeTime - getTime();
        const remainingLabel = config.languageKey === "id"
            ? `(${formatRemainingDuration(remainingSeconds)} lagi)`
            : `(${formatRemainingDuration(remainingSeconds)} remaining)`;
        return [header, `# ${weatherLine}`, `# ${remainingLabel}`].join("\n");
    }
    const startsLabel = config.languageKey === "id"
        ? `(dimulai <t:${timer.nextChangeTime}:R>)`
        : `(starts <t:${timer.nextChangeTime}:R>)`;
    return [
        header,
        `# ${getWeatherEmoji(currentWeather.name)} ${formatWeatherName(currentWeather.name)}`,
        `# ${startsLabel}`,
    ].join("\n");
}

function buildNextWeatherSection(config: Config, timer: Timer): string {
    const nextWeather = config.athletes[getNextAthleteIndex(config, timer)];

    const header = config.languageKey === "id" ? "## Cuaca Selanjutnya" : "## Next Weather";
    return [header, `### ${formatWeatherLine(nextWeather)}`].join("\n");
}

/** Discord subtext (`-#`) — smallest size available in embeds. */
function buildControlsSection(config: Config): string {
    if (config.languageKey === "id") {
        return [
            `-# Kontrol:`,
            `-# ${EMOJI_SKIP} Ganti saat cuaca berubah ke kondisi cerah atau kemarau`,
            `-# ${EMOJI_STOP} Hentikan timer cuaca atau gunakan \`/${SLASH_COMMAND.commands.stop}\``,
        ].join("\n");
    }
    return [
        `-# Controls:`,
        `-# ${EMOJI_SKIP} Skip to advance when weather changes to normal or dry conditions`,
        `-# ${EMOJI_STOP} Stop the weather timer or use \`/${SLASH_COMMAND.commands.stop}\``,
    ].join("\n");
}

function buildStatusDescription(config: Config, timer: Timer): string {
    return [
        buildCurrentWeatherSection(config, timer),
        buildNextWeatherSection(config, timer),
        WEATHER_TO_TIPS_GAP,
        getStatusTips(config.languageKey),
        buildControlsSection(config),
    ].join("\n\n");
}

export function createStatusMessage(config: Config, timer: Timer): EmbedBuilder {
    return new EmbedBuilder().setDescription(buildStatusDescription(config, timer));
}

export async function sendStatusMessage(channel: TextChannel, _scope: Scope) {
    const guildId = channel.guild.id;
    const [config, timer] = await Promise.all([configRepo.get(guildId), timerRepo.get(guildId)]);
    if (timer === undefined) {
        return;
    }

    let message: Message;
    try {
        message = await channel.send({
            embeds: [createStatusMessage(config, timer)],
            components: [createTimerButtons(config.languageKey)],
        });

        await timerRepo.update(guildId, (t) => ({
            ...t,
            status: {
                channelId: channel.id,
                messageId: message.id,
            },
        }));
    } catch (e) {
        logger.warn(guildId, "Could not send status message");
    }
}

export async function updateStatusMessage(guildId: string, _scope?: Scope) {
    const [config, timer] = await Promise.all([configRepo.get(guildId), timerRepo.get(guildId)]);
    if (timer?.status === undefined) {
        return;
    }

    try {
        const channel = (await client.channels.fetch(timer.status.channelId)) as TextChannel;
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.edit({
            embeds: [createStatusMessage(config, timer)],
            components: [createTimerButtons(config.languageKey)],
        });
    } catch (e: any) {
        // Only clear the status reference if the message/channel was genuinely deleted.
        // For transient errors (rate limits, network blips) keep the reference so we retry next tick.
        const UNKNOWN_MESSAGE = 10008;
        const UNKNOWN_CHANNEL = 10003;
        const isGone = e?.code === UNKNOWN_MESSAGE || e?.code === UNKNOWN_CHANNEL;
        if (isGone) {
            logger.warn(guildId, "Status message was deleted, clearing reference");
            await timerRepo.update(timer.guildId, (t) => ({
                ...t,
                status: undefined,
            }));
        } else {
            logger.warn(guildId, `Could not update status message (will retry): ${e?.message ?? e}`);
        }
    }
}

export async function deleteStatusMessage(guildId: string, _scope: Scope) {
    const timer = await timerRepo.get(guildId);
    if (timer?.status === undefined) {
        return;
    }

    try {
        const channel = (await client.channels.fetch(timer.status.channelId)) as TextChannel;
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.delete();
    } catch (e) {
        logger.warn(guildId, "Could not delete status message");
    }
}
