import { environment } from "./environment";

export const DEFAULT_WEATHERS = [
    { name: "extreme weather", time: 210 },
    { name: "normal weather", time: 480 },
] as const;

export const DEFAULT_START_DELAY = 0;
export const DEFAULT_TIME_PER_ATHLETE = 30;

export const EMPTY_VC_TIMEOUT = 60 * 60;

const suffix = environment.mainBot ? "" : environment.botId;

export const SLASH_COMMAND = {
    commands: {
        start: `start${suffix}`,
        stop: `stop${suffix}`,
        help: `help${suffix}`,
        join: `join${suffix}`,
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
    },
};
export const BUTTON_SOUNDBOARD_OPEN = "soundboard_open";
export const BUTTON_SOUND_PREFIX = "sound_";
export const BUTTON_SOUNDBOARD_CLOSE = "soundboard_close";
