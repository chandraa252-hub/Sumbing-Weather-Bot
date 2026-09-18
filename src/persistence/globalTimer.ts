import { environment } from "../environment";
import { DEFAULT_WEATHERS } from "../constants";
import { createDefaultGlobalState } from "../services/globalTimer";
import type { GlobalTimerState } from "../types";
import { RedisClient } from "./redis";

export class GlobalTimerRepository {
    #redisClient: RedisClient;

    constructor(redisClient: RedisClient) {
        this.#redisClient = redisClient;
    }

    #createRedisKey(): string {
        return `global-timer:${environment.botId}`;
    }

    async get(): Promise<GlobalTimerState | undefined> {
        const existing = await this.#redisClient.read<GlobalTimerState>(this.#createRedisKey());
        if (existing) {
            const weather = existing.weathers?.[0];
            const needsDurationMigration =
                existing.weathers?.length === 1 &&
                weather?.name?.toLowerCase().trim() === "extreme weather" &&
                (
                    weather.time === 690 ||
                    weather.time === 689 ||
                    weather.time === 689.1 ||
                    weather.time === 689.25
                );
            if (needsDurationMigration) {
                const migrated = {
                    ...existing,
                    weathers: DEFAULT_WEATHERS.map(({ name, time }) => ({ name, time })),
                };
                await this.set(migrated);
                return migrated;
            }
            return existing;
        }

        const defaultState = createDefaultGlobalState();
        await this.set(defaultState);
        return defaultState;
    }

    async set(state: GlobalTimerState): Promise<void> {
        await this.#redisClient.write(this.#createRedisKey(), state);
    }
}