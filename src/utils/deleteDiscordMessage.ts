import type { Message } from "discord.js";

export default function deleteDiscordMessage(message: Message, timeout: number): void {
  setTimeout(() => {
    message.deletable
      ? void message
          .delete()
          .catch(() => console.error("Bot tried to delete a message that doesn't exist"))
      : null;
  }, timeout);
}
