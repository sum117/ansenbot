import type { Message } from "discord.js";

import logger from "./loggerFactory";

export default function deleteDiscordMessage(message: Message, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      message
        .delete()
        .then(() => {
          resolve();
        })
        .catch((error) => {
          logger.error(error);
          resolve();
        });
    }, timeout);
  });
}
