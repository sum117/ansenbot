import type { Message, Snowflake } from "discord.js";
import { AttachmentBuilder, ChannelType, Collection, userMention } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

import config from "../../config.json" assert { type: "json" };
import { SPINNER_EMOJI } from "../data/constants";
import { novelRequestImageGen } from "../lib/anime-img-gen/novelAIApi";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import { BotError } from "../utils/Errors";
import Queue from "../utils/Queue";

@Discord()
export class OnImageGenerationRequest {
  private imageGenerationQueue = new Queue();
  private pendingUserImageRequests = new Collection<
    Snowflake,
    { isPending: boolean; message: Message | null }
  >();
  private _message: Message | undefined;

  get message(): Message {
    if (!this._message) {
      throw new BotError("Não foi possível achar a mensagem com inforação do seu pedido.");
    }
    return this._message;
  }

  set message(message: Message) {
    this._message = message;
  }

  @On()
  async messageCreate([message]: ArgsOf<"messageCreate">, _client: Client): Promise<void> {
    try {
      const canExecute =
        message.channel.type === ChannelType.GuildText &&
        message.channelId === config.channels.imageGen &&
        message.content.startsWith("```") &&
        !message.author.bot;

      if (!canExecute) {
        return;
      }

      if (this.pendingUserImageRequests.get(message.author.id)?.isPending) {
        await message.reply("❌ Você já tem uma imagem sendo gerada.");
        return;
      }

      if (this.pendingUserImageRequests.size > 0) {
        await message.reply(
          `⚠️ Sua imagem está na fila de espera, ${userMention(
            message.author.id
          )}. Não tente gerar outra imagem.`
        );
      }
      this.message = message;
      this.pendingUserImageRequests.set(message.author.id, {
        isPending: true,
        message: null,
      });

      await this.imageGenerationQueue.enqueue(async () => {
        await this.generateAnimeImage().catch((error) => {
          console.error("Error while generating image", error);
          this.pendingUserImageRequests.delete(message.author.id);
        });
      });
    } catch (error) {
      console.error("Error while sending image to discord", error);
      this.pendingUserImageRequests.delete(message.author.id);
    }
  }

  private async generateAnimeImage(): Promise<void> {
    const currentMessage = this.message;

    const userFeedback: string[] = [];
    // TODO: upgrade to use mustache .render() after next pull request
    userFeedback.push(
      `${SPINNER_EMOJI} ${userMention(currentMessage.author.id)} Sua imagem começou a ser gerada.`
    );
    if (!this.pendingUserImageRequests.get(currentMessage.author.id)?.message) {
      const trackedMessage = await currentMessage.reply(userFeedback.join(""));
      this.pendingUserImageRequests.set(currentMessage.author.id, {
        isPending: true,
        message: trackedMessage,
      });
    } else {
      const trackedMessage = this.pendingUserImageRequests.get(currentMessage.author.id)?.message;
      if (trackedMessage) {
        await trackedMessage.edit(userFeedback.join(""));
      }
    }

    const sanitizedMessage = currentMessage.content
      .trim()
      .replaceAll("```", "")
      .replaceAll("\n", "");

    await new Promise((resolve) => {
      setTimeout(resolve, 15_000);
    });

    const response = await novelRequestImageGen(sanitizedMessage);

    const attachment = new AttachmentBuilder(response).setName("image.png");

    const trackedMessage = this.pendingUserImageRequests.get(currentMessage.author.id)?.message;
    if (trackedMessage) {
      deleteDiscordMessage(trackedMessage, 0);
    }

    this.pendingUserImageRequests.delete(currentMessage.author.id);
    await currentMessage.channel.send({
      content: `✅ ${userMention(currentMessage.author.id)} Sua imagem foi gerada com sucesso!`,
      files: [attachment],
    });
  }
}
