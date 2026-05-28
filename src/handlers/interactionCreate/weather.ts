import type { Scope } from "@sentry/node";
import type { ChatInputCommandInteraction } from "discord.js";
import { start } from "./start";
import { stop } from "./stop";
import { skip } from "./skip";
import { reset } from "./reset";
import { status } from "./status";

export async function weather(
    interaction: ChatInputCommandInteraction,
    scope: Scope
): Promise<void> {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
        case "start":  return start(interaction, scope);
        case "stop":   return stop(interaction, scope);
        case "skip":   return skip(interaction);
        case "reset":  return reset(interaction, scope);
        case "status": return status(interaction);
    }
}
