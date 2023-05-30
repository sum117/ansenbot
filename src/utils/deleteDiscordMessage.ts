import type { Message } from "discord.js";

export default function deleteDiscordMessage(message: Message, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      message
        .delete()
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject("Não foi possível deletar a mensagem: " + error);
        });
    }, timeout);
  });
}
