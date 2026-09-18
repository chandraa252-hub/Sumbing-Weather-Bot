import { formatWeatherName } from "../util/weatherDisplay";
import { Language, VoiceCommands } from "./types";

const voiceCommands: VoiceCommands = {
    300: () => "5 minutes.",
    180: () => "3 minutes remaining.",
    60: () => "1 minute. Be careful.",
    30: () => "30 seconds.",
    15: ({ nextAthlete }) => `${formatWeatherName(String(nextAthlete))}, get ready.`,
    10: ({ started }) => (started ? "Change in 10..." : "Starting in 10..."),
    5: () => "5...",
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
