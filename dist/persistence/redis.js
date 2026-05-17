"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const redis_1 = require("redis");
const logger_1 = __importDefault(require("../services/logger"));
class RedisClient {
    #client;
    #connected;
    constructor(url) {
        this.#client = (0, redis_1.createClient)({ url });
        this.#connected = this.#connect();
    }
    async #connect() {
        logger_1.default.info(undefined, "Connecting to redis");
        await this.#client.connect();
        logger_1.default.info(undefined, "Pinging redis");
        await this.#client.ping();
        logger_1.default.info(undefined, "Redis connection established");
    }
    async waitForConnection() {
        await this.#connected;
    }
    async write(key, value) {
        const stringified = JSON.stringify(value);
        await this.#connected;
        await this.#client.set(key, stringified);
    }
    async read(key) {
        await this.#connected;
        const value = await this.#client.get(key);
        return value ? JSON.parse(value) : undefined;
    }
    async readMany(keys) {
        if (keys.length === 0) {
            return [];
        }
        await this.#connected;
        const values = await this.#client.mGet(keys);
        return values.map((value) => (value ? JSON.parse(value) : undefined));
    }
    async keys(pattern) {
        await this.#connected;
        return await this.#client.keys(pattern);
    }
    async remove(key) {
        await this.#connected;
        await this.#client.del(key);
    }
    async exists(key) {
        await this.#connected;
        const count = await this.#client.exists(key);
        return count > 0;
    }
}
exports.RedisClient = RedisClient;
