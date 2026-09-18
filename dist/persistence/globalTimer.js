"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalTimerRepository = void 0;
const environment_1 = require("../environment");
const constants_1 = require("../constants");
const globalTimer_1 = require("../services/globalTimer");
class GlobalTimerRepository {
    #redisClient;
    constructor(redisClient) {
        this.#redisClient = redisClient;
    }
    #createRedisKey() {
        return `global-timer:${environment_1.environment.botId}`;
    }
    async get() {
        const existing = await this.#redisClient.read(this.#createRedisKey());
        if (existing) {
            const weather = existing.weathers?.[0];
            const needsDurationMigration = existing.weathers?.length === 1 &&
                weather?.name?.toLowerCase().trim() === "extreme weather" &&
                (weather.time === 690 ||
                    weather.time === 689 ||
                    weather.time === 689.1 ||
                    weather.time === 689.25);
            if (needsDurationMigration) {
                const migrated = {
                    ...existing,
                    weathers: constants_1.DEFAULT_WEATHERS.map(({ name, time }) => ({ name, time })),
                };
                await this.set(migrated);
                return migrated;
            }
            return existing;
        }
        const defaultState = (0, globalTimer_1.createDefaultGlobalState)();
        await this.set(defaultState);
        return defaultState;
    }
    async set(state) {
        await this.#redisClient.write(this.#createRedisKey(), state);
    }
}
exports.GlobalTimerRepository = GlobalTimerRepository;
