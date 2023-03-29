/* eslint-disable camelcase */
import { ChannelType } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

import { loadVectorStore, makeChain } from "../lib/ansen-gpt";

const vectorStore = await loadVectorStore();
const ansenGPT = makeChain(vectorStore);
let history: string[][] = [];

@Discord()
export class Example {
  @On()
  async messageCreate(
    [message]: ArgsOf<"messageCreate">,
    _client: Client
  ): Promise<void> {
    async function clearChannel(): Promise<void> {
      const isTextChannel = message.channel.type === ChannelType.GuildText;
      history = [];
      const channelMessages = await message.channel.messages.fetch();
      if (isTextChannel) {
        await message.channel.bulkDelete(channelMessages);
      }
      return;
    }

    const isValidMessage =
      message.channel.id === "1090234136951799818" ||
      !message.author.bot ||
      message.mentions.has(message.client.user.id);

    const isClearCommand =
      message.content === ".clear" &&
      message.channel.id === "1090234136951799818";

    if (!isValidMessage) {
      return;
    } else if (isClearCommand) {
      return clearChannel();
    }
    const sanitizedMessage = message.content.replace(/<@!?[0-9]+>/g, "");

    const response = await ansenGPT.call({
      chat_history: history,
      question: sanitizedMessage,
    });
    history = [...history, [sanitizedMessage, response.text]];
    if (history.length > 10) {
      history = history.slice(0, 8);
    }
    await message.channel.sendTyping();
    await message.channel.send(response.text);
  }
}
