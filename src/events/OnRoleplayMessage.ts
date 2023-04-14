import type { Message } from "discord.js";
import { channelMention, ChannelType, userMention } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";
import mustache from "mustache";

import config from "../../config.json" assert { type: "json" };
import CharacterPost from "../lib/discord/Character/classes/CharacterPost";
import CharacterFetcher from "../lib/pocketbase/CharacterFetcher";
import PlayerFetcher from "../lib/pocketbase/PlayerFetcher";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";
import diffPercentage from "../utils/diffPercentage";

@Discord()
export class OnRoleplayMessage {
  @On({ event: "messageCreate" })
  async main([message]: ArgsOf<"messageCreate">): Promise<void> {
    if (!this.isValidRoleplayMessage(message)) {
      return;
    }

    const player = await PlayerFetcher.getPlayerById(message.author.id);

    if (!player?.currentCharacterId) {
      this.sendMissingCharacterMessage(message);
      return;
    }

    const currentCharacter = await CharacterFetcher.getCharacterById(player.currentCharacterId);
    const characterPost = new CharacterPost(currentCharacter);
    const messageOptions = await characterPost.createMessageOptions({
      to: "message",
      content: message.content,
      attachmentUrl: message.attachments.first()?.url,
    });

    void deleteDiscordMessage(message, 1000);
    void message.channel.send(messageOptions);
  }

  private async checkSimilarityFromPreviousMessages(message: Message<true>) {
    const lastMessages = await message.channel.messages.fetch({ limit: 10 });
    const similarMessages = lastMessages.filter((lastMessage) => {
      const prevCharacter = lastMessage.embeds[0]?.title;
      const prevContent = lastMessage.embeds[0]?.description;

      if (!prevContent || !prevCharacter) {
        return false;
      }

      if (diffPercentage(message.content, prevContent) < 80) {
        return true;
      }
    });
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
