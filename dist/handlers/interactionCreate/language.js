"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.language = language;
const languages_1 = require("../../languages");
const persistence_1 = require("../../persistence");
const WEATHER_NAMES_BY_LANGUAGE = {
    "en": "extreme weather",
    "en-us": "extreme weather",
    "id": "cuaca buruk",
};
async function language(interaction) {
    const guildId = interaction.guildId;
    const selectedKey = interaction.options.getString("language", true);
    const lang = languages_1.LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }
    const config = await persistence_1.configRepo.get(guildId);
    const defaultWeatherName = WEATHER_NAMES_BY_LANGUAGE[selectedKey];
    const updatedAthletes = config.athletes.map((athlete, i) => {
        if (i === 0)
            return { ...athlete, name: defaultWeatherName };
        return athlete;
    });
    await persistence_1.configRepo.set({ ...config, languageKey: selectedKey, athletes: updatedAthletes });
    await interaction.editReply(`Language set to **${lang.name}**.`);
}
