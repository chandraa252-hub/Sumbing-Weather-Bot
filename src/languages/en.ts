import { formatWeatherName } from "../util/weatherDisplay";
import { Language, VoiceCommands } from "./types";

const voiceCommands: VoiceCommands = {
    300: () => "5 minutes. Still a long way to go.",
    180: () => "3 minutes remaining.",
    60: () => "1 minute. Be careful.",
    30: () => "30 seconds.",
    15: ({ nextAthlete }) => `${formatWeatherName(String(nextAthlete))}, get ready.`,
    10: ({ started }) => (started ? "Weather change in 10..." : "Weather starting in 10..."),
    5: () => "5...",
    2: () => "2...",
    1: () => "1...",
    0: ({ nextAthlete, started }) =>
        started ? `Changed to ${formatWeatherName(String(nextAthlete))}.` : "Let's go!",
    skip: ({ nextAthlete }) => `Go ${formatWeatherName(String(nextAthlete))}!`,
};

export const language: Language = {
    key: "en",
    name: "English",
    locale: "en-GB",
    voiceCommands,
};
