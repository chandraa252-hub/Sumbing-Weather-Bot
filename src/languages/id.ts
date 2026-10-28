import { formatWeatherName } from "../util/weatherDisplay";
import { Language, Locale, VoiceCommands } from "./types";

const voiceCommands: VoiceCommands = {
    480: () => "8 menit tersisa.",
    300: () => "5 menit tersisa.",
    240: () => "4 menit tersisa.",
    180: () => "3 menit tersisa.",
    120: () => "2 menit tersisa.",
    60: () => "1 menit tersisa.",
    30: () => "30 detik tersisa.",
    0: ({ nextAthlete, started }) =>
        started ? `Ganti ke ${formatWeatherName(String(nextAthlete))}.` : "Ayo mulai!",
    skip: ({ nextAthlete }) => `Ganti ke ${formatWeatherName(String(nextAthlete))}!`,
};

export const language: Language = {
    key: "id",
    name: "Indonesia",
    locale: "id" as Locale,
    voiceCommands,
};
