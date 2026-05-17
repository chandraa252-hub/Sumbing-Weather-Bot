"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = void 0;
const weatherDisplay_1 = require("../util/weatherDisplay");
const voiceCommands = {
    300: () => "5 minutes. Still a long way to go.",
    180: () => "3 minutes remaining.",
    60: () => "1 minute. Be careful.",
    30: () => "30 seconds.",
    15: ({ nextAthlete }) => `${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}, get ready.`,
    10: ({ started }) => (started ? "Weather change in 10..." : "Weather starting in 10..."),
    5: () => "5...",
    2: () => "2...",
    1: () => "1...",
    0: ({ nextAthlete, started }) => started ? `Changed to ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}.` : "Let's go!",
    skip: ({ nextAthlete }) => `Go ${(0, weatherDisplay_1.formatWeatherName)(String(nextAthlete))}!`,
};
exports.language = {
    key: "en",
    name: "English",
    locale: "en-GB",
    voiceCommands,
};
