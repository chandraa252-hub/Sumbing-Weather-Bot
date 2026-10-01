"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = void 0;
const weatherDisplay_1 = require("../util/weatherDisplay");
const voiceCommands = {
    480: () => "8 minutes remaining.",
    300: () => "5 minutes remaining.",
    240: () => "4 minutes remaining.",
    180: () => "3 minutes remaining.",
    120: () => "2 minutes remaining.",
    60: () => "1 minute remaining.",
    30: () => "30 seconds remaining.",
    15: ({ nextAthlete }) => [
        { text: `${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}, get ready.`, pauseAfterMs: 2_000 },
        { text: "Change in 10 seconds." },
    ],
    0: ({ nextAthlete, started }) => started ? `Changed to ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.` : "Let's go!",
    skip: ({ nextAthlete }) => `Change to ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.`,
};
exports.language = {
    key: "en",
    name: "English",
    locale: "en-GB",
    voiceCommands,
};
