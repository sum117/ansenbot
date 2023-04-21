import type { Message, Snowflake } from "discord.js";
import { AttachmentBuilder, ChannelType, Collection, userMention } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

import config from "../../config.json" assert { type: "json" };
import { novelRequestImageGen } from "../lib/anime-img-gen/novelAIApi";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import { BotError } from "../utils/Errors";
import Queue from "../utils/Queue";

@Discord()
export class Example {
  private imageGenerationQueue = new Queue();
  private pendingUserImageRequests = new Collection<
    Snowflake,
    { isPending: boolean; message: Message | null }
  >();
  private _message: Message | undefined;

  get message(): Message {
    if (!this._message) {
      throw new BotError("Message not set for image generation");
    }
    return this._message;
  }

  set message(message: Message) {
    this._message = message;
  }

  @On()
  messageCreate([message]: ArgsOf<"messageCreate">, _client: Client): void {
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
        void message.reply("❌ Você já tem uma imagem sendo gerada.");
        return;
      }

      if (this.pendingUserImageRequests.size > 0) {
        void message.reply(
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
      void this.imageGenerationQueue.enqueue(async () => {
        await this.generateAnimeImage();
      });
    } catch (error) {
      console.error("Error while generating image", error);
    }
  }

  private async generateAnimeImage(): Promise<void> {
    const currentMessage = this.message;

    const userFeedback: string[] = [];
    const spinnerEmoji = "<a:spinner:1094479348037324820>";
    // TODO: upgrade to use mustache .render() after next pull request
    userFeedback.push(
      `${spinnerEmoji} ${userMention(currentMessage.author.id)} Sua imagem começou a ser gerada.`
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

    /* 
    ----------------- Local Image Generation -----------------
    const { stream } = await localRequestImageGen(currentMessage.content);
    const onProgress = async (step: number, totalSteps: number) => {
      const [bar, calculated] = progressBar.filledBar(totalSteps, step, 10, "▬", "🟩");
      const message: string[] = [];
      message.push(`✅ ${userMention(currentMessage.author.id)} Sua imagem começou a ser gerada.`);
      message.push(`⏳ ${bar} ${calculated}%`);

    }; 
    */

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
    void currentMessage.channel.send({
      content: `✅ ${userMention(currentMessage.author.id)} Sua imagem foi gerada com sucesso!`,
      files: [attachment],
    });
  }
}
