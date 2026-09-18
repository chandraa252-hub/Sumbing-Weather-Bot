import { ChatInputCommandInteraction } from "discord.js";
import { LANGUAGES } from "../../languages";
import { LanguageKey } from "../../languages/types";
import { configRepo } from "../../persistence";

const WEATHER_NAMES_BY_LANGUAGE: Record<LanguageKey, string> = {
    "en": "extreme weather",
    "en-us": "extreme weather",
    "id": "cuaca buruk",
};

export async function language(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const selectedKey = interaction.options.getString("language", true) as LanguageKey;

    const lang = LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }

    const config = await configRepo.get(guildId);

    const defaultWeatherName = WEATHER_NAMES_BY_LANGUAGE[selectedKey];

    const updatedAthletes = config.athletes.map((athlete, i) => {
        if (i === 0) return { ...athlete, name: defaultWeatherName };
        return athlete;
    });

    await configRepo.set({ ...config, languageKey: selectedKey, athletes: updatedAthletes });

    await interaction.editReply(`Language set to **${lang.name}**.`);
}
