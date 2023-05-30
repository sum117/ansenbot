import type { Message } from "discord.js";

export default function deleteDiscordMessage(message: Message, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      message
        .delete()
        .then(() => {
          resolve();
        })
        .catch((error) => {
          console.error(error);
          resolve();
        });
    }, timeout);
  });
}
