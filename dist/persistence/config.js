"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigRepository = void 0;
const constants_1 = require("../constants");
const environment_1 = require("../environment");
const DEFAULT_CONFIG = {
    startDelay: constants_1.DEFAULT_START_DELAY,
    athletes: constants_1.DEFAULT_WEATHERS.map(({ name, time }) => ({ name, time })),
    languageKey: "en",
};
function isLegacyDefaultWeathers(value) {
    if (!Array.isArray(value)) {
        return false;
    }
    if (value.length === 1) {
        const onlyWeather = value[0];
        const onlyName = typeof onlyWeather?.name === "string" ? onlyWeather.name.toLowerCase().trim() : "";
        return ((onlyWeather?.time === 690 ||
            onlyWeather?.time === 689 ||
            onlyWeather?.time === 689.1 ||
            onlyWeather?.time === 689.25) &&
            onlyName === "extreme weather");
    }
    if (value.length !== 2) {
        return false;
    }
    const [first, second] = value;
    if (!first || !second || typeof first !== "object" || typeof second !== "object") {
        return false;
    }
    const firstWeather = first;
    const secondWeather = second;
    const firstName = typeof firstWeather.name === "string" ? firstWeather.name.toLowerCase().trim() : "";
    const secondName = typeof secondWeather.name === "string" ? secondWeather.name.toLowerCase().trim() : "";
    return (firstWeather.time === 210 &&
        secondWeather.time === 480 &&
        firstName === "extreme weather" &&
        (secondName === "normal weather" || secondName === "cuaca cerah")) || (firstWeather.time === 210 &&
        secondWeather.time === 480 &&
        firstName === "cuaca buruk" &&
        secondName === "cuaca cerah");
}
class ConfigRepository {
    #redisClient;
    constructor(redisClient) {
        this.#redisClient = redisClient;
    }
    #createRedisKey(guildId) {
        return environment_1.environment.mainBot ? `config:${guildId}` : `config:${guildId}:${environment_1.environment.botId}`;
    }
    async exists(guildId) {
        const key = this.#createRedisKey(guildId);
        return await this.#redisClient.exists(key);
    }
    async get(guildId) {
        const key = this.#createRedisKey(guildId);
        const config = await this.#redisClient.read(key);
        const mergedConfig = {
            ...DEFAULT_CONFIG,
            ...(config ? config : {}),
            guildId,
        };
        // Migrate untouched configurations from the former two-weather default.
        // Custom weather rotations are preserved.
        if (isLegacyDefaultWeathers(mergedConfig.athletes)) {
            const migratedConfig = {
                ...mergedConfig,
                athletes: DEFAULT_CONFIG.athletes.map(({ name, time }) => ({ name, time })),
            };
            await this.#redisClient.write(key, migratedConfig);
            return migratedConfig;
        }
        return mergedConfig;
    }
    async set(config) {
        const key = this.#createRedisKey(config.guildId);
        await this.#redisClient.write(key, config);
    }
    async remove(guildId) {
        const key = this.#createRedisKey(guildId);
        await this.#redisClient.remove(key);
    }
}
exports.ConfigRepository = ConfigRepository;
