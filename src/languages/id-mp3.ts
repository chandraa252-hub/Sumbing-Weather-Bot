import type { Language } from "./types";

export const language: Language = {
    key: "id-mp3",
    name: "Bahasa Indonesia (MP3)",
    locale: "id-ID",
    // Deliberately empty: this option must never fall back to Google TTS.
    voiceCommands: {},
    audioCommands: {
        300: "assets/weather-audio/id-mp3/5min.mp3",
        180: "assets/weather-audio/id-mp3/3min.mp3",
        60: "assets/weather-audio/id-mp3/1min.mp3",
        30: "assets/weather-audio/id-mp3/30s.mp3",
        15: "assets/weather-audio/id-mp3/danger.mp3",
    },
};
