import { ChatInputCommandInteraction } from "discord.js";
import { LANGUAGES } from "../../languages";
import { LanguageKey } from "../../languages/types";
import { configRepo } from "../../persistence";
import { DEFAULT_WEATHER_NAME_ALIASES, DEFAULT_WEATHER_NAMES } from "../../languages/localized";

export async function language(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const selectedKey = interaction.options.getString("language", true) as LanguageKey;

    const lang = LANGUAGES.find((l) => l.key === selectedKey);
    if (!lang) {
        await interaction.editReply("Invalid language.");
        return;
    }

    const config = await configRepo.get(guildId);

    const updatedAthletes = config.athletes.map((athlete, i) => {
        const isDefaultName = DEFAULT_WEATHER_NAME_ALIASES.has(athlete.name.toLowerCase().trim());
        if (i === 0 && isDefaultName) {
            return { ...athlete, name: DEFAULT_WEATHER_NAMES[selectedKey] };
        }
        return athlete;
    });

    await configRepo.set({ ...config, languageKey: selectedKey, athletes: updatedAthletes });

    await interaction.editReply(`Language set to **${lang.name}**.`);
}
