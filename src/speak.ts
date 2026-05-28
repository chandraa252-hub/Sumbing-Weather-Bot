import { createAudioPlayer, createAudioResource, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { getAudioUrl } from "google-tts-api";
import { environment } from "./environment";
import { LANGUAGES } from "./languages";
import { LanguageKey, Locale } from "./languages/types";
import logger from "./services/logger";
import { download } from "./util/download";
import { duckSleepcall, unduckSleepcall, isSleepcallActive } from "./services/sleepcall";

export async function speak(text: string, locale: Locale, connection: VoiceConnection): Promise<void> {
    if (connection.state.status !== VoiceConnectionStatus.Ready) {
        return;
    }

    if (environment.logging.speak) {
        logger.info(connection.joinConfig.guildId, `Speak: "${text}"`);
    }

    const guildId = connection.joinConfig.guildId;
    const wasActive = isSleepcallActive(guildId);
    if (wasActive) duckSleepcall(guildId);

    try {
    await new Promise<void>(async (resolve, reject) => {
        const url = getAudioUrl(text, {
            lang: locale,
            slow: false,
            host: "https://translate.google.com",
        });

        const player = createAudioPlayer();
        const subscription = connection.subscribe(player);

        const filename = await download(url);
        const resource = createAudioResource(filename);

        player.play(resource);
        player.on("error", reject);

        const timeout = setTimeout(() => {
            player.stop();
            subscription?.unsubscribe();
            resolve();
        }, 5_000);

        resource.playStream.on("end", () => {
            clearTimeout(timeout);
            subscription?.unsubscribe();
            resolve();
        });
    });
    } finally {
        if (wasActive) unduckSleepcall(guildId);
    }
}

export async function speakCommand(
    command: string,
    args: Record<string, unknown>,
    connection: VoiceConnection,
    languageKey: LanguageKey
): Promise<void> {
    const { locale, voiceCommands } = LANGUAGES.find((language) => language.key === languageKey)!;

    if (!voiceCommands[command]) {
        return;
    }
    const text = voiceCommands[command](args);
    await speak(text, locale, connection);
}
