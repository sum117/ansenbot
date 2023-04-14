import type { Message } from "discord.js";
import {
  AttachmentBuilder,
  channelMention,
  ChannelType,
  EmbedBuilder,
  userMention,
} from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";
import mustache from "mustache";

import config from "../../config.json" assert { type: "json" };
import CharacterPost from "../lib/discord/Character/classes/CharacterPost";
import CharacterFetcher from "../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../lib/pocketbase/PlayerFetcher";
import PostFetcher from "../lib/pocketbase/PostFetcher";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import equalityPercentage from "../utils/equalityPercentage";
import safePromise from "../utils/safePromise";

@Discord()
export class OnRoleplayMessage {
  @On({ event: "messageCreate" })
  async main([message]: ArgsOf<"messageCreate">): Promise<void> {
    if (!this.isValidRoleplayMessage(message)) {
      return;
    }

    const [player, playerFetchError] = await safePromise(
      PlayerFetcher.getPlayerById(message.author.id)
    );

    if (playerFetchError) {
      console.error("Error fetching player", playerFetchError);
      this.sendMissingCharacterMessage(message);
      return;
    }

    const [currentCharacter, currentCharacterError] = await safePromise(
      CharacterFetcher.getCharacterById(player.currentCharacterId)
    );

    if (currentCharacterError) {
      console.error("Error fetching current character", currentCharacterError);
      this.sendMissingCharacterMessage(message);
      return;
    }

    const characterPost = new CharacterPost(currentCharacter);
    const [messageOptions, messageOptionsError] = await safePromise(
      characterPost.createMessageOptions({
        to: "message",
        content: message.content,
        attachmentUrl: message.attachments.first()?.url,
      })
    );

    if (messageOptionsError) {
      console.error("Error creating message options", messageOptionsError);
      void message.reply("Ocorreu um erro ao tentar enviar a mensagem.");
      return;
    }

    void deleteDiscordMessage(message, 1000);
    const similarMessage = await this.checkSimilarityFromPreviousMessages(message);

    if (similarMessage) {
      const attachmentUrl = similarMessage.embeds[0]?.image?.url;

      // Maintain the image if the message is similar and no new image is provided
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
    const [_createdPost, createPostError] = await safePromise(PostFetcher.createPost(postMessage));

    if (createPostError) {
      console.error("Error creating post", createPostError);
      return;
    }
  }

  private async checkSimilarityFromPreviousMessages(message: Message) {
    if (!message.inGuild()) {
      return;
    }
    const lastMessages = await message.channel.messages.fetch({ limit: 10 });
    const similarMessage = lastMessages.find((lastMessage) => {
      const prevCharacter = lastMessage.embeds[0]?.title;
      const prevContent = lastMessage.embeds[0]?.description;

      if (!prevContent || !prevCharacter) {
        return false;
      }
      const equality = equalityPercentage(prevContent, message.content);
      console.log(prevContent, message.content);
      console.log(equality);
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

  private sendMissingCharacterMessage(message: Message): void {
    const view = {
      user: userMention(message.author.id),
      channel: channelMention(config.channels.createCharacter),
    };
    const reply = mustache.render(
      "{{{user}}} você não tem um personagem selecionado. Crie um em {{{channel}}}",
      view
    );
    void message.reply(reply);
  }
}
