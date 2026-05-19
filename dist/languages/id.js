"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = void 0;
const weatherDisplay_1 = require("../util/weatherDisplay");
const voiceCommands = {
    300: () => "5 menit lagi, masih lama.",
    180: () => "3 menit tersisa.",
    60: () => "1 menit lagi, hati-hati!",
    30: () => "30 detik.",
    15: ({ nextAthlete }) => `${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}, siap-siap!`,
    10: () => "10...",
    5: () => "5...",
    2: () => "2...",
    1: () => "1...",
    0: ({ nextAthlete, started }) => started ? `Ganti ke ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.` : "Ayo mulai!",
    skip: ({ nextAthlete }) => `Ganti ke ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}!`,
};
exports.language = {
    key: "id",
    name: "Indonesia",
    locale: "id",
    voiceCommands,
};
