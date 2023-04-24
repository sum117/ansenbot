import type { Message } from "discord.js";

export default function deleteDiscordMessage(message: Message, timeout: number): void {
  setTimeout(() => {
    message.deletable
      ? void message.delete().catch(() => console.error("Could not delete message"))
      : null;
  }, timeout);
}
