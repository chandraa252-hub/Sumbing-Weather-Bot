"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skipCurrentAthlete = skipCurrentAthlete;
exports.getNextAthleteIndex = getNextAthleteIndex;
exports.addTimer = addTimer;
exports.stopTimer = stopTimer;
const persistence_1 = require("../persistence");
const persistence_2 = require("../persistence");
const speak_1 = require("../speak");
const getVoiceConnection_1 = require("../util/getVoiceConnection");
const time_1 = require("../util/time");
const statusMessage_1 = require("./statusMessage");
async function skipCurrentAthlete(guildId) {
    const [timer, config] = await Promise.all([persistence_2.timerRepo.get(guildId), persistence_1.configRepo.get(guildId)]);
    if (timer === undefined || config === undefined) {
        return;
    }
    const nextAthleteIndex = getNextAthleteIndex(config, timer);
    await persistence_2.timerRepo.update(guildId, (t) => ({
        ...t,
        nextChangeTime: (0, time_1.getTime)() + config.athletes[nextAthleteIndex].time,
        currentAthleteIndex: nextAthleteIndex,
        started: true,
    }));
    const voiceConnection = await (0, getVoiceConnection_1.getVoiceConnection)(config);
    if (voiceConnection) {
        (0, speak_1.speakCommand)("skip", { nextAthlete: config.athletes[nextAthleteIndex].name }, voiceConnection, config.languageKey);
    }
}
function getNextAthleteIndex(config, timer) {
    if (!timer.started) {
        return 0;
    }
    return (timer.currentAthleteIndex + 1) % config.athletes.length;
}
async function addTimer(guildId, channel, scope) {
    if (await persistence_2.timerRepo.exists(guildId)) {
        return;
    }
    const config = await persistence_1.configRepo.get(guildId);
    const now = (0, time_1.getTime)();
    const timer = {
        guildId,
        nextChangeTime: now + (config.startDelay === 0 ? config.athletes[0].time : config.startDelay),
        currentAthleteIndex: 0,
        started: config.startDelay === 0,
        disabledAthletes: [],
    };
    await persistence_2.timerRepo.set(timer);
    await (0, statusMessage_1.sendStatusMessage)(channel, scope);
}
async function stopTimer(guildId, scope) {
    await (0, statusMessage_1.deleteStatusMessage)(guildId, scope);
    await persistence_2.timerRepo.remove(guildId);
}
