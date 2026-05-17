"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClientWithCache = void 0;
const redis_1 = require("./redis");
/**
 * Caches data in memory to reduce the number of redis calls.
 * Assumes redis is not changed by other processes.
 */
class RedisClientWithDataCache extends redis_1.RedisClient {
    #dataCache = new Map();
    async write(key, value) {
        await super.write(key, value);
        this.#dataCache.set(key, value);
    }
    async read(key) {
        if (this.#dataCache.has(key)) {
            return this.#dataCache.get(key);
        }
        const redisResult = await super.read(key);
        if (redisResult !== undefined) {
            this.#dataCache.set(key, redisResult);
        }
        return redisResult;
    }
    async readMany(keys) {
        const cachedValues = keys.map((key) => this.#dataCache.get(key));
        if (cachedValues.every((value) => value !== undefined)) {
            return cachedValues;
        }
        const redisResults = await super.readMany(keys);
        for (const [i, redisResult] of redisResults.entries()) {
            if (redisResult !== undefined) {
                this.#dataCache.set(keys[i], redisResult);
            }
        }
        return redisResults;
    }
    async remove(key) {
        await super.remove(key);
        this.#dataCache.delete(key);
    }
    async exists(key) {
        if (this.#dataCache.has(key)) {
            return true;
        }
        return await super.exists(key);
    }
}
class RedisClientWithKeysCache extends RedisClientWithDataCache {
    #keysCache = new Map();
    async write(key, value) {
        await super.write(key, value);
        this.#keysCache.clear();
    }
    async remove(key) {
        await super.remove(key);
        this.#keysCache.clear();
    }
    async keys(pattern) {
        if (this.#keysCache.has(pattern)) {
            return this.#keysCache.get(pattern);
        }
        const redisResult = await super.keys(pattern);
        this.#keysCache.set(pattern, redisResult);
        return redisResult;
    }
}
exports.RedisClientWithCache = RedisClientWithKeysCache;
