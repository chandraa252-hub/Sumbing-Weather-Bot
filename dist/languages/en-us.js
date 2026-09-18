"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = void 0;
const weatherDisplay_1 = require("../util/weatherDisplay");
const voiceCommands = {
    300: () => "5 minutes.",
    180: () => "3 minutes remaining.",
    60: () => "1 minute. Be careful.",
    30: () => "30 seconds.",
    15: ({ nextAthlete }) => `${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}, get ready.`,
    10: ({ started }) => (started ? "Change in 10..." : "Starting in 10..."),
    5: () => "5...",
    0: ({ nextAthlete, started }) => started ? `Changed to ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.` : "Let's go!",
    skip: ({ nextAthlete }) => `Change to ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.`,
};
exports.language = {
    key: "en-us",
    name: "English (US)",
    locale: "en-US",
    voiceCommands,
};
