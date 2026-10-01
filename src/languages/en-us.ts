import { formatWeatherName } from "../util/weatherDisplay";
import { Language, VoiceCommands } from "./types";

const voiceCommands: VoiceCommands = {
    480: () => "8 minutes remaining.",
    300: () => "5 minutes remaining.",
    240: () => "4 minutes remaining.",
    180: () => "3 minutes remaining.",
    120: () => "2 minutes remaining.",
    60: () => "1 minute remaining.",
    30: () => "30 seconds remaining.",
    15: ({ nextAthlete }) => [
        { text: `${formatWeatherName(String(nextAthlete))}, get ready.`, pauseAfterMs: 2_000 },
        { text: "Change in 10 seconds." },
    ],
    0: ({ nextAthlete, started }) =>
        started ? `Changed to ${formatWeatherName(String(nextAthlete))}.` : "Let's go!",
    skip: ({ nextAthlete }) => `Change to ${formatWeatherName(String(nextAthlete))}.`,
};

export const language: Language = {
    key: "en-us",
    name: "English (US)",
    locale: "en-US",
    voiceCommands,
};
