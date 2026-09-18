"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weather = weather;
const start_1 = require("./start");
const stop_1 = require("./stop");
const globalTimer_1 = require("./globalTimer");
async function weather(interaction, scope) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case "start": return (0, start_1.start)(interaction, scope);
        case "stop": return (0, stop_1.stop)(interaction, scope);
        case "start-global": return (0, globalTimer_1.startGlobal)(interaction, scope);
        case "stop-global": return (0, globalTimer_1.stopGlobal)(interaction, scope);
        case "adjust-global": return (0, globalTimer_1.adjustGlobal)(interaction, scope);
    }
}
