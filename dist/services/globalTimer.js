"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GLOBAL_START_AT = void 0;
exports.isGlobalAdmin = isGlobalAdmin;
exports.getDefaultGlobalWeathers = getDefaultGlobalWeathers;
exports.createDefaultGlobalState = createDefaultGlobalState;
exports.createRunningGlobalState = createRunningGlobalState;
exports.createStoppedGlobalState = createStoppedGlobalState;
exports.parseWitaTime = parseWitaTime;
exports.getGlobalTimerSnapshot = getGlobalTimerSnapshot;
const constants_1 = require("../constants");
const environment_1 = require("../environment");
const time_1 = require("../util/time");
const WITA_OFFSET_SECONDS = environment_1.environment.globalTimer.utcOffsetHours * 60 * 60;
exports.DEFAULT_GLOBAL_START_AT = Math.floor(Date.UTC(2026, 8, 15, 15, 52, 24) / 1_000);
function isGlobalAdmin(userId) {
    return environment_1.environment.globalTimer.adminIds.includes(userId);
}
function getDefaultGlobalWeathers() {
    return constants_1.DEFAULT_WEATHERS.map(({ name, time }) => ({ name, time }));
}
function createDefaultGlobalState() {
    return {
        status: "running",
        startAt: exports.DEFAULT_GLOBAL_START_AT,
        weathers: getDefaultGlobalWeathers(),
        updatedAt: (0, time_1.getTime)(),
    };
}
function createRunningGlobalState(startAt = (0, time_1.getTime)(), stopAt, cycleDuration) {
    return {
        status: "running",
        startAt,
        ...(stopAt === undefined ? {} : { stopAt }),
        ...(cycleDuration === undefined ? {} : { cycleDuration }),
        weathers: getDefaultGlobalWeathers(),
        updatedAt: (0, time_1.getTime)(),
    };
}
function createStoppedGlobalState(previous) {
    return {
        status: "stopped",
        startAt: previous?.startAt,
        ...(previous?.cycleDuration === undefined ? {} : { cycleDuration: previous.cycleDuration }),
        weathers: previous?.weathers?.length ? previous.weathers : getDefaultGlobalWeathers(),
        updatedAt: (0, time_1.getTime)(),
    };
}
function parseWitaTime(value, now = (0, time_1.getTime)()) {
    if (value === undefined) {
        return now;
    }
    const match = value.trim().match(/^(\d{1,2})[.:](\d{2})[.:](\d{2})$/);
    if (!match) {
        return undefined;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (hours > 23 || minutes > 59 || seconds > 59) {
        return undefined;
    }
    const localNow = new Date((now + WITA_OFFSET_SECONDS) * 1_000);
    const utcMilliseconds = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), hours, minutes, seconds);
    return Math.round(utcMilliseconds / 1_000) - WITA_OFFSET_SECONDS;
}
function getGlobalTimerSnapshot(state, guildId, now = (0, time_1.getTime)()) {
    if (!state ||
        state.status !== "running" ||
        state.startAt === undefined ||
        (state.stopAt !== undefined && now >= state.stopAt)) {
        return undefined;
    }
    const weathers = state.weathers?.length ? state.weathers : getDefaultGlobalWeathers();
    if (now < state.startAt) {
        return {
            guildId,
            nextChangeTime: state.startAt,
            currentAthleteIndex: 0,
            started: false,
            disabledAthletes: [],
        };
    }
    const weatherDuration = weathers.reduce((total, weather) => total + weather.time, 0);
    const totalDuration = state.cycleDuration ?? weatherDuration;
    if (weatherDuration <= 0 || !Number.isFinite(totalDuration) || totalDuration <= 0) {
        return undefined;
    }
    const elapsed = now - state.startAt;
    const cycleElapsed = elapsed % totalDuration;
    const cycleStart = state.startAt + (elapsed - cycleElapsed);
    const durationScale = totalDuration / weatherDuration;
    let accumulated = 0;
    let currentAthleteIndex = 0;
    for (let index = 0; index < weathers.length; index += 1) {
        const weatherEnd = (accumulated + weathers[index].time) * durationScale;
        if (cycleElapsed < weatherEnd) {
            currentAthleteIndex = index;
            return {
                guildId,
                nextChangeTime: cycleStart + weatherEnd,
                currentAthleteIndex,
                started: true,
                disabledAthletes: [],
            };
        }
        accumulated = weatherEnd;
    }
    return {
        guildId,
        nextChangeTime: cycleStart + totalDuration,
        currentAthleteIndex: weathers.length - 1,
        started: true,
        disabledAthletes: [],
    };
}
