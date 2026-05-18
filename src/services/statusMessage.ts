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

function createTimerButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_SKIP)
            .setLabel(`${EMOJI_SKIP} Next weather`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_STOP)
            .setLabel(`${EMOJI_STOP} Stop timer`)
            .setStyle(ButtonStyle.Danger),
    );
}

function buildCurrentWeatherSection(config: Config, timer: Timer): string {
    const currentWeather = config.athletes[timer.currentAthleteIndex];
    const weatherLine = formatWeatherLine(currentWeather);

    if (timer.started) {
        const remainingSeconds = timer.nextChangeTime - getTime();
        return [`# Current Weather`, `# ${weatherLine} (${formatRemainingDuration(remainingSeconds)} remaining)`].join("\n");
    }

    return [
        `# Current Weather`,
        `# ${getWeatherEmoji(currentWeather.name)} ${formatWeatherName(currentWeather.name)} (starts <t:${timer.nextChangeTime}:R>)`,
    ].join("\n");
}

function buildNextWeatherSection(config: Config, timer: Timer): string {
    const nextWeather = config.athletes[getNextAthleteIndex(config, timer)];

    return [`## Next Weather`, `### ${formatWeatherLine(nextWeather)}`].join("\n");
}

/** Discord subtext (`-#`) — smallest size available in embeds. */
function buildControlsSection(): string {
    return [
        `-# Controls:`,
        `-# ${EMOJI_SKIP} Skip to advance when weather changes to normal or dry conditions`,
        `-# ${EMOJI_STOP} Stop the weather timer or use \`/${SLASH_COMMAND.name} stop\``,
    ].join("\n");
}

function buildStatusDescription(config: Config, timer: Timer): string {
    return [
        buildCurrentWeatherSection(config, timer),
        buildNextWeatherSection(config, timer),
        WEATHER_TO_TIPS_GAP,
        STATUS_TIPS,
        buildControlsSection(),
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
            components: [createTimerButtons()],
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
            components: [createTimerButtons()],
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
