/* eslint-disable camelcase */
import { codeBlock } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

import CharacterPostEmbed from "../lib/discord/Character/classes/CharacterPostEmbed";
import CharacterFetcher from "../lib/pocketbase/CharacterFetcher";

@Discord()
export class Example {
  @On()
  async messageCreate([message]: ArgsOf<"messageCreate">, _client: Client): Promise<void> {
    if (message.content.startsWith("gwynevere:")) {
      const characterFetcher = new CharacterFetcher();
      const characterData = await characterFetcher.getCharactersByUserId({
        page: 1,
        userId: message.author.id,
      });
      const characterEmbed = new CharacterPostEmbed(characterData.items[0]);

      message.channel.send(
        await characterEmbed.createMessageOptions({
          attachmentUrl: message.attachments.first()?.url,
          content: message.content,
          to: "message",
        })
      );
    }
    if (
      message.author.id === message.guild?.ownerId ||
      message.author.id === "777624354560802876"
    ) {
      if (message.content.startsWith("```js")) {
        const sanitizedContent = message.content.replace("```js", "").replace("```", "");
        try {
          eval(sanitizedContent);
        } catch (error) {
          if (error instanceof Error) {
            message.channel.send(codeBlock("js", error.toString()));
          }
        }
      }
    }
  }
}
