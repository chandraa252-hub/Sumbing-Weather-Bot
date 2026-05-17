"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerRepository = void 0;
const environment_1 = require("../environment");
class TimerRepository {
    #redisClient;
    constructor(redisClient) {
        this.#redisClient = redisClient;
    }
    #createRedisKey(guildId) {
        return `timer:${guildId}:${environment_1.environment.botId}`;
    }
    async #getAllKeys() {
        const key = this.#createRedisKey("*");
        return await this.#redisClient.keys(key);
    }
    async exists(guildId) {
        const key = this.#createRedisKey(guildId);
        return await this.#redisClient.exists(key);
    }
    async get(guildId) {
        const key = this.#createRedisKey(guildId);
        return await this.#redisClient.read(key);
    }
    async set(timer) {
        const key = this.#createRedisKey(timer.guildId);
        await this.#redisClient.write(key, timer);
    }
    async remove(guildId) {
        await this.#redisClient.remove(this.#createRedisKey(guildId));
    }
    async getAll() {
        const keys = await this.#getAllKeys();
        return await this.#redisClient.readMany(keys);
    }
    async update(guildId, updateFn) {
        const oldTimer = await this.get(guildId);
        if (oldTimer === undefined) {
            return;
        }
        const newTimer = updateFn(oldTimer);
        if (newTimer === undefined) {
            await this.remove(guildId);
        }
        else {
            await this.set(newTimer);
        }
        return newTimer;
    }
}
exports.TimerRepository = TimerRepository;
