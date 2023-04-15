import type { Message } from "discord.js";
import { AttachmentBuilder, ChannelType, EmbedBuilder } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";

import CharacterPost from "../lib/discord/Character/classes/CharacterPost";
import CharacterFetcher from "../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../lib/pocketbase/PlayerFetcher";
import PostFetcher from "../lib/pocketbase/PostFetcher";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import equalityPercentage from "../utils/equalityPercentage";
import { BotError, PocketBaseError } from "../utils/Errors";

@Discord()
export class OnRoleplayMessage {
  @On({ event: "messageCreate" })
  async main([message]: ArgsOf<"messageCreate">): Promise<void> {
    try {
      if (!this.isValidRoleplayMessage(message)) {
        return;
      }
      const player = await PlayerFetcher.getPlayerById(message.author.id);
      const currentCharacter = await CharacterFetcher.getCharacterById(player.currentCharacterId);
      const characterPost = new CharacterPost(currentCharacter);
      const messageOptions = await characterPost.createMessageOptions({
        to: "message",
        content: message.content,
        attachmentUrl: message.attachments.first()?.url,
      });
      void deleteDiscordMessage(message, 1000);
      const similarMessage = await this.checkSimilarityFromPreviousMessages(message);
      if (similarMessage) {
        const attachmentUrl = similarMessage.embeds[0]?.image?.url;
        if (attachmentUrl && !message.attachments.first()?.url) {
          const attachmentName = attachmentUrl?.split("/").pop();
          if (!attachmentName) {
            void similarMessage.edit(messageOptions);
            return;
          }
          const attachment = new AttachmentBuilder(attachmentUrl).setName(attachmentName);
          const embed = EmbedBuilder.from(similarMessage.embeds[0]);
          embed.setImage("attachment://" + attachment.name);
          messageOptions.files = [attachment];
          messageOptions.embeds = [embed];
        }

        void similarMessage.edit(messageOptions);
        return;
      }
      const postMessage = await message.channel.send(messageOptions);
      postMessage.author.id = message.author.id;
      postMessage.content = message.content;
      await PostFetcher.createPost(postMessage);
    } catch (error) {
      if (error instanceof PocketBaseError) {
        void message.reply(error.message);
        return;
      }
      console.error(error);
    }
  }

  private async checkSimilarityFromPreviousMessages(message: Message) {
    if (!message.inGuild()) {
      throw new BotError("Message is not in guild");
    }
    const lastMessages = await message.channel.messages.fetch({ limit: 10 });
    const similarMessage = lastMessages.find((lastMessage) => {
      const prevCharacter = lastMessage.embeds[0]?.title;
      const prevContent = lastMessage.embeds[0]?.description;

      if (!prevContent || !prevCharacter) {
        return false;
      }
      const equality = equalityPercentage(prevContent, message.content);
      if (equality > 80) {
        return true;
      }
    });
    return similarMessage;
  }

  private isValidRoleplayMessage(message: Message): boolean {
    if (!message.inGuild() || !message.channel.parent) {
      return false;
    }
    return (
      message.channel.type === ChannelType.GuildText &&
      message.channel.parent.name.startsWith("RP") &&
      !message.author.bot
    );
  }
}
