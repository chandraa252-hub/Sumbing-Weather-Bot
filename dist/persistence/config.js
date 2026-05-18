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
        return {
            ...DEFAULT_CONFIG,
            ...(config ? config : {}),
            guildId,
        };
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
