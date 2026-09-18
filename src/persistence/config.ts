import { DEFAULT_START_DELAY, DEFAULT_WEATHERS } from "../constants";
import { environment } from "../environment";
import type { Config } from "../types";
import { RedisClient } from "./redis";

const DEFAULT_CONFIG: Omit<Config, "guildId"> = {
    startDelay: DEFAULT_START_DELAY,
    athletes: DEFAULT_WEATHERS.map(({ name, time }) => ({ name, time })),
    languageKey: "en",
};

function isLegacyDefaultWeathers(value: unknown): boolean {
    if (!Array.isArray(value)) {
        return false;
    }

    if (value.length === 1) {
        const onlyWeather = value[0] as { name?: unknown; time?: unknown };
        const onlyName = typeof onlyWeather?.name === "string" ? onlyWeather.name.toLowerCase().trim() : "";
        return (
            (
                onlyWeather?.time === 690 ||
                onlyWeather?.time === 689 ||
                onlyWeather?.time === 689.1 ||
                onlyWeather?.time === 689.25
            ) &&
            onlyName === "extreme weather"
        );
    }

    if (value.length !== 2) {
        return false;
    }

    const [first, second] = value;
    if (!first || !second || typeof first !== "object" || typeof second !== "object") {
        return false;
    }

    const firstWeather = first as { name?: unknown; time?: unknown };
    const secondWeather = second as { name?: unknown; time?: unknown };
    const firstName = typeof firstWeather.name === "string" ? firstWeather.name.toLowerCase().trim() : "";
    const secondName = typeof secondWeather.name === "string" ? secondWeather.name.toLowerCase().trim() : "";

    return (
        firstWeather.time === 210 &&
        secondWeather.time === 480 &&
        firstName === "extreme weather" &&
        (secondName === "normal weather" || secondName === "cuaca cerah")
    ) || (
        firstWeather.time === 210 &&
        secondWeather.time === 480 &&
        firstName === "cuaca buruk" &&
        secondName === "cuaca cerah"
    );
}

export class ConfigRepository {
    #redisClient: RedisClient;

    constructor(redisClient: RedisClient) {
        this.#redisClient = redisClient;
    }

    #createRedisKey(guildId: string): string {
        return environment.mainBot ? `config:${guildId}` : `config:${guildId}:${environment.botId}`;
    }

    async exists(guildId: string): Promise<boolean> {
        const key = this.#createRedisKey(guildId);
        return await this.#redisClient.exists(key);
    }

    async get(guildId: string): Promise<Config> {
        const key = this.#createRedisKey(guildId);
        const config = await this.#redisClient.read(key);
        const mergedConfig: Config = {
            ...DEFAULT_CONFIG,
            ...(config ? config : {}),
            guildId,
        };

        // Migrate untouched configurations from the former two-weather default.
        // Custom weather rotations are preserved.
        if (isLegacyDefaultWeathers(mergedConfig.athletes)) {
            const migratedConfig: Config = {
                ...mergedConfig,
                athletes: DEFAULT_CONFIG.athletes.map(({ name, time }) => ({ name, time })),
            };
            await this.#redisClient.write(key, migratedConfig);
            return migratedConfig;
        }

        return mergedConfig;
    }

    async set(config: Config): Promise<void> {
        const key = this.#createRedisKey(config.guildId);
        await this.#redisClient.write(key, config);
    }

    async remove(guildId: string): Promise<void> {
        const key = this.#createRedisKey(guildId);
        await this.#redisClient.remove(key);
    }
}
