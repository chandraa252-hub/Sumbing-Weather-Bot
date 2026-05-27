import { environment } from "../environment";

export interface SleepcallState {
    guildId: string;
    channelId: string;
    youtubeUrl: string;
}

export class SleepcallRepository {
    #redisClient: any;
    constructor(redisClient: any) {
        this.#redisClient = redisClient;
    }
    #createRedisKey(guildId: string) {
        return `sleepcall:${guildId}:${environment.botId}`;
    }
    async get(guildId: string): Promise<SleepcallState | undefined> {
        return await this.#redisClient.read(this.#createRedisKey(guildId));
    }
    async set(data: SleepcallState): Promise<void> {
        await this.#redisClient.write(this.#createRedisKey(data.guildId), data);
    }
    async remove(guildId: string): Promise<void> {
        await this.#redisClient.remove(this.#createRedisKey(guildId));
    }
    async getAll(): Promise<SleepcallState[]> {
        const keys = await this.#redisClient.keys(this.#createRedisKey("*"));
        if (keys.length === 0) return [];
        return await this.#redisClient.readMany(keys);
    }
}
