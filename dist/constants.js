"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUTTON_SOUNDBOARD_CLOSE = exports.BUTTON_SOUND_PREFIX = exports.BUTTON_SOUNDBOARD_OPEN = exports.SLASH_COMMAND = exports.DEFAULT_TIME_PER_ATHLETE = exports.DEFAULT_START_DELAY = exports.DEFAULT_WEATHERS = void 0;
const environment_1 = require("./environment");
exports.DEFAULT_WEATHERS = [
    { name: "extreme weather", time: 689.5 },
];
exports.DEFAULT_START_DELAY = 0;
exports.DEFAULT_TIME_PER_ATHLETE = 30;
const suffix = environment_1.environment.mainBot ? "" : environment_1.environment.botId;
exports.SLASH_COMMAND = {
    commands: {
        weather: `weather${suffix}`,
        help: `help${suffix}`,
        leave: `leave${suffix}`,
        language: `language${suffix}`,
        soundboard: `soundboard${suffix}`,
        join: `join${suffix}`,
        adminMessage: `admin-message${suffix}`,
    },
};
exports.BUTTON_SOUNDBOARD_OPEN = "soundboard_open";
exports.BUTTON_SOUND_PREFIX = "sound_";
exports.BUTTON_SOUNDBOARD_CLOSE = "soundboard_close";
