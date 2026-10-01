"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = void 0;
const weatherDisplay_1 = require("../util/weatherDisplay");
const voiceCommands = {
    480: () => "8 menit tersisa.",
    300: () => "5 menit tersisa.",
    240: () => "4 menit tersisa.",
    180: () => "3 menit tersisa.",
    120: () => "2 menit tersisa.",
    60: () => "1 menit tersisa.",
    30: () => "30 detik tersisa.",
    15: ({ nextAthlete }) => [
        { text: `${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}, bersiap!`, pauseAfterMs: 2_000 },
        { text: "Berganti dalam 10 detik." },
    ],
    0: ({ nextAthlete, started }) => started ? `Ganti ke ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.` : "Ayo mulai!",
    skip: ({ nextAthlete }) => `Ganti ke ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}!`,
};
exports.language = {
    key: "id",
    name: "Indonesia",
    locale: "id",
    voiceCommands,
};
