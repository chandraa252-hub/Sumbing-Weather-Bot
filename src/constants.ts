import { environment } from "./environment";

export const DEFAULT_WEATHERS = [
    { name: "extreme weather", time: 689.5 },
] as const;

export const DEFAULT_START_DELAY = 0;
export const DEFAULT_TIME_PER_ATHLETE = 30;

const suffix = environment.mainBot ? "" : environment.botId;

export const SLASH_COMMAND = {
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

export const BUTTON_SOUNDBOARD_OPEN = "soundboard_open";
export const BUTTON_SOUND_PREFIX = "sound_";
export const BUTTON_SOUNDBOARD_CLOSE = "soundboard_close";
