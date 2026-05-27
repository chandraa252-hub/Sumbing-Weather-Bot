"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SleepcallRepository = void 0;
const environment_1 = require("../environment");
class SleepcallRepository {
    #redisClient;
    constructor(redisClient) {
        this.#redisClient = redisClient;
    }
    #createRedisKey(guildId) {
        return `sleepcall:${guildId}:${environment_1.environment.botId}`;
    }
    async get(guildId) {
        return await this.#redisClient.read(this.#createRedisKey(guildId));
    }
    async set(data) {
        await this.#redisClient.write(this.#createRedisKey(data.guildId), data);
    }
    async remove(guildId) {
        await this.#redisClient.remove(this.#createRedisKey(guildId));
    }
    async getAll() {
        const keys = await this.#redisClient.keys(this.#createRedisKey("*"));
        if (keys.length === 0) return [];
        return await this.#redisClient.readMany(keys);
    }
}
exports.SleepcallRepository = SleepcallRepository;
