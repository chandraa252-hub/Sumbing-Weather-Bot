import type { Athlete } from "../types";

export function getWeatherEmoji(weatherName: string): string {
    const name = weatherName.toLowerCase();
    if (name.includes("extreme") || name.includes("thunder") || name.includes("buruk") || name.includes("ekstrem")) {
        return "🌩️";
    }
    if (name.includes("night")) {
        return "🌙";
    }
    if (name.includes("rain")) {
        return "🌧️";
    }
    if (name.includes("snow")) {
        return "❄️";
    }
    if (name.includes("fog") || name.includes("mist")) {
        return "🌫️";
    }
    return "🌤️";
}

export function formatWeatherName(weatherName: string): string {
    return weatherName.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatWeatherLine(weather: Athlete): string {
    return `${getWeatherEmoji(weather.name)} ${formatWeatherName(weather.name)}`;
}

export function formatRemainingDuration(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}