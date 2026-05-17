"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLASH_COMMAND = exports.EMPTY_VC_TIMEOUT = exports.DEFAULT_TIME_PER_ATHLETE = exports.DEFAULT_START_DELAY = exports.DEFAULT_WEATHERS = void 0;
const environment_1 = require("./environment");
exports.DEFAULT_WEATHERS = [
    { name: "extreme weather", time: 210 },
    { name: "normal weather", time: 480 },
];
exports.DEFAULT_START_DELAY = 0;
exports.DEFAULT_TIME_PER_ATHLETE = 30;
exports.EMPTY_VC_TIMEOUT = 60 * 60; // 60 minutes
// Slash Commands
exports.SLASH_COMMAND = {
    name: `timer${environment_1.environment.mainBot ? "" : environment_1.environment.botId}`,
    commands: {
        start: "start",
        stop: "stop",
        help: "help",
        athletes: {
            name: "weathers",
            athletesCount: 8,
            athletesPrefix: "weather",
            timePrefix: "time",
        },
        skip: {
            name: "skip",
        },
        reset: {
            name: "reset",
        },
    },
};
