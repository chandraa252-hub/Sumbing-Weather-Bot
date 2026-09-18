import type { Scope } from "@sentry/node";
import type { ChatInputCommandInteraction } from "discord.js";
import { start } from "./start";
import { stop } from "./stop";
import { adjustGlobal, startGlobal, stopGlobal } from "./globalTimer";

export async function weather(
    interaction: ChatInputCommandInteraction,
    scope: Scope
): Promise<void> {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case "start":  return start(interaction, scope);
        case "stop":   return stop(interaction, scope);
        case "start-global": return startGlobal(interaction, scope);
        case "stop-global": return stopGlobal(interaction, scope);
        case "adjust-global": return adjustGlobal(interaction, scope);
    }
}
