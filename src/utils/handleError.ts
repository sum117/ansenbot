import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { DiscordAPIError } from "discord.js";
import { ClientResponseError } from "pocketbase";
import { inspect } from "util";
import { ZodError } from "zod";

import deleteDiscordMessage from "./deleteDiscordMessage";
import { PocketBaseError } from "./Errors";
import getSafeEntries from "./getSafeEntries";

export default function handleError(
  interaction:
    | ChatInputCommandInteraction
    | ModalSubmitInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction,
  error: unknown
): void {
  console.error(inspect(error, false, null, true));
  let errorMessage = "Ocorreu um erro ao executar essa ação.";
  if (error instanceof DiscordAPIError) {
    return;
  }
  if (error instanceof PocketBaseError) {
    errorMessage = error.message;
  }

  if (error instanceof ClientResponseError) {
    for (const object in error.response.data) {
      const entries = getSafeEntries(error.response.data[object]);
      for (const [_key, value] of entries) {
        errorMessage = `${String(object)}: ${value}`;
      }
    }
  }

  if (error instanceof ZodError) {
    errorMessage = error.errors[0].message;
  }

  void interaction.channel?.send(errorMessage).then((message) => {
    deleteDiscordMessage(message, 5000);
  });
}
