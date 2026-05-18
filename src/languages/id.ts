import { formatWeatherName } from "../util/weatherDisplay";
import { Language, VoiceCommands } from "./types";

const voiceCommands: VoiceCommands = {
    300: () => "5 menit lagi.",
    180: () => "3 menit tersisa.",
    60: () => "1 menit lagi. Bersiaplah.",
    30: () => "30 detik.",
    15: ({ nextAthlete }) => `${formatWeatherName(String(nextAthlete))}, bersiap-siap.`,
    10: ({ started }) => (started ? "Cuaca berganti dalam 10..." : "Cuaca dimulai dalam 10..."),
    5: () => "5...",
    2: () => "2...",
    1: () => "1...",
    0: ({ nextAthlete, started }) =>
        started ? `Berganti ke ${formatWeatherName(String(nextAthlete))}.` : "Ayo mulai!",
    skip: ({ nextAthlete }) => `Lanjut ${formatWeatherName(String(nextAthlete))}!`,
};

export const language: Language = {
    key: "id",
    name: "Indonesia",
    locale: "id",
    voiceCommands,
};
