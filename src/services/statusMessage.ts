import { type Scope } from "@sentry/node";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from "discord.js";
import { SLASH_COMMAND, BUTTON_SOUNDBOARD_OPEN } from "../constants";
import { client } from "../discord";
import { configRepo } from "../persistence";
import { timerRepo } from "../persistence";
import { globalTimerRepo } from "../persistence";
import type { Config, GlobalTimerState, Timer } from "../types";
import { EMOJI_STOP } from "../util/emojis";
import { getTime } from "../util/time";
import { formatRemainingDuration } from "../util/weatherDisplay";
import { getGlobalTimerSnapshot } from "./globalTimer";
import logger from "./logger";

export const BUTTON_STOP = "timer_stop";
export const BUTTON_HELP = "timer_help";

/** Discord collapses extra `\n` in embeds; braille blank lines keep visible vertical space. */
const BLANK_LINE = "\u2800";
/** Single gap between the next-weather label and tips. */
const WEATHER_TO_TIPS_GAP = `${BLANK_LINE}`;

function getStatusTips(languageKey: string): string {
    if (languageKey === "id") {
        return [
            "⚠️ Bersiaplah menghadapi perubahan cuaca mendadak.",
            "Berhati-hati saat cuaca badai petir.",
            BLANK_LINE,
            "☕ STMJ dianjurkan saat cuaca malam hari.",
            "Durasi efek STMJ: 5 menit.",
            BLANK_LINE,
            "🪨 Di Watu Kotak, STMJ + Obor diperlukan",
            "saat Cuaca Buruk antara pukul 02:00 - 05:59.",
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
            "during Extreme Weather between 02:00 - 05:59.",
    ].join("\n");
}

function createTimerButtons(languageKey: string): ActionRowBuilder<ButtonBuilder> {
    const stopLabel = languageKey === "id" ? `${EMOJI_STOP} Berhenti` : `${EMOJI_STOP} Stop timer`;
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_STOP)
            .setLabel(stopLabel)
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(BUTTON_SOUNDBOARD_OPEN)
            .setLabel("🎵 Soundboard")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(BUTTON_HELP)
            .setLabel("❓ Help")
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildNextWeatherSection(config: Config, timer: Timer, globalState?: GlobalTimerState): string {
    const header = config.languageKey === "id" ? "# ⚡ Cuaca Buruk Berikutnya" : "# ⚡ Next Extreme Weather";
    if (globalState && (!getGlobalTimerSnapshot(globalState, timer.guildId) || globalState.status === "stopped")) {
        const stoppedLabel = config.languageKey === "id" ? "(timer global berhenti)" : "(global timer stopped)";
        return [header, `# ${stoppedLabel}`].join("\n");
    }

    const displayTimer = globalState
        ? getGlobalTimerSnapshot(globalState, timer.guildId) ?? timer
        : timer;
    if (displayTimer.started) {
        const remainingSeconds = displayTimer.nextChangeTime - getTime();
        const remainingLabel = config.languageKey === "id"
            ? `(${formatRemainingDuration(remainingSeconds)} lagi)`
            : `(${formatRemainingDuration(remainingSeconds)} remaining)`;
        return [header, `# ${remainingLabel}`].join("\n");
    }

    const startsLabel = config.languageKey === "id"
        ? `(dimulai <t:${displayTimer.nextChangeTime}:R>)`
        : `(starts <t:${displayTimer.nextChangeTime}:R>)`;
    return [header, `# ${startsLabel}`].join("\n");
}

/** Discord subtext (`-#`) — smallest size available in embeds. */
function buildControlsSection(config: Config): string {
    if (config.languageKey === "id") {
        return [
            `-# Kontrol:`,
            `-# ${EMOJI_STOP} Matikan timer atau gunakan \`/${SLASH_COMMAND.commands.weather} stop\``,
            `-# ❓ Tekan Help untuk panduan penggunaan`,
        ].join("\n");
    }
    return [
        `-# Controls:`,
        `-# ${EMOJI_STOP} Stop the timer or use \`/${SLASH_COMMAND.commands.weather} stop\``,
        `-# ❓ Press Help for usage instructions`,
    ].join("\n");
}

function buildStatusDescription(config: Config, timer: Timer, globalState?: GlobalTimerState): string {
    return [
        buildNextWeatherSection(config, timer, globalState),
        WEATHER_TO_TIPS_GAP,
        getStatusTips(config.languageKey),
        buildControlsSection(config),
    ].join("\n\n");
}

export function createStatusMessage(
    config: Config,
    timer: Timer,
    globalState?: GlobalTimerState
): EmbedBuilder {
    return new EmbedBuilder().setDescription(buildStatusDescription(config, timer, globalState));
}

export async function sendStatusMessage(channel: TextChannel, _scope: Scope) {
    const guildId = channel.guild.id;
    const [config, timer, globalState] = await Promise.all([
        configRepo.get(guildId),
        timerRepo.get(guildId),
        globalTimerRepo.get(),
    ]);
    if (timer === undefined) {
        return;
    }

    let message: Message;
    try {
        message = await channel.send({
            embeds: [createStatusMessage(config, timer, globalState)],
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
    const [config, timer, globalState] = await Promise.all([
        configRepo.get(guildId),
        timerRepo.get(guildId),
        globalTimerRepo.get(),
    ]);
    if (timer?.status === undefined) {
        return;
    }

    try {
        const channel = (await client.channels.fetch(timer.status.channelId)) as TextChannel;
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.edit({
            embeds: [createStatusMessage(config, timer, globalState)],
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
