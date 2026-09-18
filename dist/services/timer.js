"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextAthleteIndex = getNextAthleteIndex;
exports.addTimer = addTimer;
exports.stopTimer = stopTimer;
const persistence_1 = require("../persistence");
const persistence_2 = require("../persistence");
const globalTimer_1 = require("./globalTimer");
const statusMessage_1 = require("./statusMessage");
function getNextAthleteIndex(config, timer) {
    if (!timer.started) {
        return 0;
    }
    return (timer.currentAthleteIndex + 1) % config.athletes.length;
}
async function addTimer(guildId, channel, scope) {
    const globalState = await persistence_2.globalTimerRepo.get();
    const globalTimer = (0, globalTimer_1.getGlobalTimerSnapshot)(globalState, guildId);
    if (!globalTimer) {
        return false;
    }
    if (await persistence_1.timerRepo.exists(guildId)) {
        return false;
    }
    const timer = {
        ...globalTimer,
        guildId,
        disabledAthletes: [],
    };
    await persistence_1.timerRepo.set(timer);
    await (0, statusMessage_1.sendStatusMessage)(channel, scope);
    return true;
}
async function stopTimer(guildId, scope) {
    await (0, statusMessage_1.deleteStatusMessage)(guildId, scope);
    await persistence_1.timerRepo.remove(guildId);
}
