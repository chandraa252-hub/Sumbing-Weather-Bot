"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSoundboardPanel = createSoundboardPanel;
exports.soundboard = soundboard;
const discord_js_1 = require("discord.js");
const constants_1 = require("../../constants");
const persistence_1 = require("../../persistence");
const soundboard_1 = require("../../services/soundboard");
function createSoundboardPanel(languageKey) {
    const sounds = (0, soundboard_1.listSounds)();
    const embed = new discord_js_1.EmbedBuilder().setTitle("🎵 SOUNDBOARD").setColor(0x2ecc71);
    const closeLabel = languageKey === "id" ? "❌ Tutup" : "❌ Close";
    const controlRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(constants_1.BUTTON_SOUNDBOARD_CLOSE)
        .setLabel(closeLabel)
        .setStyle(discord_js_1.ButtonStyle.Danger));
    if (sounds.length === 0) {
        embed.setDescription(languageKey === "id"
            ? "Belum ada audio. Tambahkan file `.mp3`/`.ogg`/`.wav` ke folder `sounds/`."
            : "No sounds yet. Add `.mp3`/`.ogg`/`.wav` files to the `sounds/` folder.");
        return { embeds: [embed], components: [controlRow] };
    }
    embed.setDescription(languageKey === "id"
        ? "Pilih suara yang ingin dimainkan di voice channel:"
        : "Choose a sound to play in the voice channel:");
    const components = [];
    for (let i = 0; i < sounds.length; i += 5) {
        components.push(new discord_js_1.ActionRowBuilder().addComponents(...sounds.slice(i, i + 5).map((s) => new discord_js_1.ButtonBuilder()
            .setCustomId(`${constants_1.BUTTON_SOUND_PREFIX}${s.value}`)
            .setLabel(s.name)
            .setStyle(discord_js_1.ButtonStyle.Success))));
        if (components.length >= 4)
            break;
    }
    components.push(controlRow);
    return { embeds: [embed], components };
}
async function soundboard(interaction, _scope) {
    const config = await persistence_1.configRepo.get(interaction.guildId);
    await interaction.editReply(createSoundboardPanel(config.languageKey));
}
