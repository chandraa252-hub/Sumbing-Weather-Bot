"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlashCommandHashRepository = void 0;
const object_hash_1 = __importDefault(require("object-hash"));
class SlashCommandHashRepository {
    #redisClient;
    #key;
    constructor(redisClient, botId) {
        this.#redisClient = redisClient;
        this.#key = `slash-command-hash:${botId}`;
    }
    async set(commandOrHash) {
        const hash = typeof commandOrHash === "string" ? commandOrHash : (0, object_hash_1.default)(commandOrHash);
        await this.#redisClient.write(this.#key, hash);
    }
    async get() {
        return await this.#redisClient.read(this.#key);
    }
}
exports.SlashCommandHashRepository = SlashCommandHashRepository;
