import type { Message } from "discord.js";

export default function deleteDiscordMessage(message: Message, timeout: number): void {
  setTimeout(() => {
    message.deletable
      ? message.delete().catch(() => console.error("Não foi possível deletar a mensagem."))
      : null;
  }, timeout);
}
