import { createAudioPlayer, createAudioResource, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { getAudioUrl } from "google-tts-api";
import { environment } from "./environment";
import { LANGUAGES } from "./languages";
import { LanguageKey, Locale } from "./languages/types";
import logger from "./services/logger";
import { download } from "./util/download";
import { getTime } from "./util/time";

const speechQueues = new Map<string, Promise<void>>();
const DEFAULT_MAX_ANNOUNCEMENT_DELAY_SECONDS = 3;

export async function speak(text: string, locale: Locale, connection: VoiceConnection): Promise<void> {
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        return;
    }

    if (environment.logging.speak) {
        logger.info(connection.joinConfig.guildId, `Speak: "${text}"`);
    }

    const guildId = connection.joinConfig.guildId;
    const url = getAudioUrl(text, {
        lang: locale,
        slow: false,
        host: "https://translate.google.com",
    });
    const player = createAudioPlayer();
    const subscription = connection.subscribe(player);

    try {
        const filename = await download(url);
        const resource = createAudioResource(filename);

        await new Promise<void>((resolve, reject) => {
            let settled = false;

            const cleanup = () => {
                clearTimeout(timeout);
                player.removeListener("error", onError);
                resource.playStream.removeListener("end", onEnd);
            };

            const onEnd = () => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                resolve();
            };

            const onError = (error: Error) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(error);
            };

            const timeout = setTimeout(() => {
                onEnd();
            }, 5_000);

            player.once("error", onError);
            resource.playStream.once("end", onEnd);
            player.play(resource);
        });
    } finally {
        subscription?.unsubscribe();
        player.stop(true);
    }
}

interface SpeechCommandOptions {
    /**
     * Epoch seconds when this countdown announcement was due.
     * Stale countdowns are skipped instead of being played late.
     */
    dueAt?: number;
    maxDelaySeconds?: number;
}

export async function speakCommand(
    command: string,
    args: Record<string, unknown>,
    connection: VoiceConnection,
    languageKey: LanguageKey,
    options: SpeechCommandOptions = {}
): Promise<void> {
    const language = LANGUAGES.find((candidate) => candidate.key === languageKey);
    if (!language) {
        return;
    }

    const { locale, voiceCommands } = language;
    if (!voiceCommands[command]) {
        return;
    }
    const text = voiceCommands[command](args);
    const guildId = connection.joinConfig.guildId;
    const previous = speechQueues.get(guildId) ?? Promise.resolve();
    const current = previous
        .catch(() => undefined)
        .then(async () => {
            if (options.dueAt !== undefined) {
                const maxDelay = options.maxDelaySeconds ?? DEFAULT_MAX_ANNOUNCEMENT_DELAY_SECONDS;
                const delay = getTime() - options.dueAt;
                if (delay > maxDelay) {
                    logger.info(guildId, `Skipping stale voice announcement "${text}" (${delay}s late)`);
                    return;
                }
            }

            await speak(text, locale, connection);
        });
    speechQueues.set(guildId, current);

    try {
        await current;
    } finally {
        if (speechQueues.get(guildId) === current) {
            speechQueues.delete(guildId);
        }
    }
}
