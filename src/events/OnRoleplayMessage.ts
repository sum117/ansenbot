import { channelMention, ChannelType, userMention } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, On } from "discordx";
import mustache from "mustache";

import config from "../../config.json" assert { type: "json" };
import CharacterPost from "../lib/discord/Character/classes/CharacterPost";
import CharacterFetcher from "../lib/pocketbase/CharacterFetcher";
import deleteDiscordMessage from "../utils/deleteDiscordMessage";

@Discord()
export class OnRoleplayMessage {
  private characterFetcher: CharacterFetcher = new CharacterFetcher();

  @On({ event: "messageCreate" })
  async sendRoleplayPost([message]: ArgsOf<"messageCreate">): Promise<void> {
    const validRoleplayMessage =
      message.channel.type === ChannelType.GuildText &&
      message.channel.parent?.name.startsWith("RP") &&
      !message.author.bot;
    if (!validRoleplayMessage) {
      return;
    }
    const player = await this.characterFetcher.getPlayerById(message.author.id);

    if (!player?.currentCharacterId) {
      const view = {
        user: userMention(message.author.id),
        channel: channelMention(config.channels.createCharacter),
      };
      void message.reply(
        mustache.render(
          "{{{user}}} você não tem um personagem selecionado. Crie um em {{{channel}}}",
          view
        )
      );
      return;
    }

    const currentCharacter = await this.characterFetcher.getCharacterById(
      player.currentCharacterId
    );
    const characterPost = new CharacterPost(currentCharacter);
    const messageOptions = await characterPost.createMessageOptions({
      to: "message",
      content: message.content,
      attachmentUrl: message.attachments.first()?.url,
    });
    void deleteDiscordMessage(message, 1000);
    void message.channel.send(messageOptions);
  }
}
