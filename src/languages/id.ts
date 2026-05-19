import { formatWeatherName } from "../util/weatherDisplay";
import { Language, VoiceCommands } from "./types";

const voiceCommands: VoiceCommands = {
    300: () => "5 menit lagi, masih lama.",
    180: () => "3 menit tersisa.",
    60: () => "1 menit lagi, hati-hati!",
    30: () => "30 detik.",
    15: ({ nextAthlete }) => `${formatWeatherName(String(nextAthlete))}, siap-siap!`,
    10: () => "10...",
    5: () => "5...",
    2: () => "2...",
    1: () => "1...",
    0: ({ nextAthlete, started }) =>
        started ? `Ganti ke ${formatWeatherName(String(nextAthlete))}.` : "Ayo mulai!",
    skip: ({ nextAthlete }) => `Ganti ke ${formatWeatherName(String(nextAthlete))}!`,
};

export const language: Language = {
    key: "id",
    name: "Indonesia",
    locale: "id",
    voiceCommands,
};
