"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUTTON_SOUNDBOARD_CLOSE = exports.BUTTON_SOUND_PREFIX = exports.BUTTON_SOUNDBOARD_OPEN = exports.SLASH_COMMAND = exports.EMPTY_VC_TIMEOUT = exports.DEFAULT_TIME_PER_ATHLETE = exports.DEFAULT_START_DELAY = exports.DEFAULT_WEATHERS = void 0;
const environment_1 = require("./environment");
exports.DEFAULT_WEATHERS = [
    { name: "extreme weather", time: 210 },
    { name: "normal weather", time: 480 },
];
exports.DEFAULT_START_DELAY = 0;
exports.DEFAULT_TIME_PER_ATHLETE = 30;
exports.EMPTY_VC_TIMEOUT = 60 * 60;
const suffix = environment_1.environment.mainBot ? "" : environment_1.environment.botId;
exports.SLASH_COMMAND = {
    commands: {
        start: `start${suffix}`,
        stop: `stop${suffix}`,
        help: `help${suffix}`,
        status: `status${suffix}`,
        leave: `leave${suffix}`,
        athletes: {
            name: `weathers${suffix}`,
            athletesCount: 8,
            athletesPrefix: "weather",
            timePrefix: "time",
        },
        skip: {
            name: `skip${suffix}`,
        },
        reset: {
            name: `reset${suffix}`,
        },
        language: `language${suffix}`,
        soundboard: `soundboard${suffix}`,
        join: `join${suffix}`,
    },
};
exports.BUTTON_SOUNDBOARD_OPEN = "soundboard_open";
exports.BUTTON_SOUND_PREFIX = "sound_";
exports.BUTTON_SOUNDBOARD_CLOSE = "soundboard_close";
