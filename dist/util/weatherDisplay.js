"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherEmoji = getWeatherEmoji;
exports.formatWeatherName = formatWeatherName;
exports.formatWeatherLine = formatWeatherLine;
exports.formatRemainingDuration = formatRemainingDuration;
function getWeatherEmoji(weatherName) {
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
function formatWeatherName(weatherName) {
    return weatherName.replace(/\b\w/g, (char) => char.toUpperCase());
}
function formatWeatherLine(weather) {
    return `${getWeatherEmoji(weather.name)} ${formatWeatherName(weather.name)}`;
}
function formatRemainingDuration(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}
