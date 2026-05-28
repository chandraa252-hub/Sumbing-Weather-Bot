"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weather = weather;
const start_1 = require("./start");
const stop_1 = require("./stop");
const skip_1 = require("./skip");
const reset_1 = require("./reset");
const status_1 = require("./status");

async function weather(interaction, scope) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case "start":  return (0, start_1.start)(interaction, scope);
        case "stop":   return (0, stop_1.stop)(interaction, scope);
        case "skip":   return (0, skip_1.skip)(interaction);
        case "reset":  return (0, reset_1.reset)(interaction, scope);
        case "status": return (0, status_1.status)(interaction);
    }
}
