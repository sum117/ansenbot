import type { Message } from "discord.js";

export default function deleteDiscordMessage(message: Message, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (message.deletable) {
        message
          .delete()
          .then(() => {
            resolve();
          })
          .catch((error) => {
            console.error("Não foi possível deletar a mensagem.");
            reject(error);
          });
      } else {
        resolve();
      }
    }, timeout);
  });
}
