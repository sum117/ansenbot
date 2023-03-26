import { AttachmentBuilder, codeBlock } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";
import prettier from "prettier";

import { PocketBase } from "../lib/pocketbase";
import { CharacterFetcher } from "../lib/pocketbase/Character";

const characterFetcher = new CharacterFetcher();

@Discord()
export class Example {
  @On()
  async messageCreate(
    [message]: ArgsOf<"messageCreate">,
    _client: Client
  ): Promise<void> {
    if (
      (message.author.id === "969062359442280548" ||
        message.author.id === "151124382578769920") &&
      message.content.startsWith("!test")
    ) {
      const characterList = await characterFetcher.getCharactersByUserId({
        page: 1,
        userId: "969062359442280548",
      });

      const content = codeBlock(
        "json",
        prettier.format(JSON.stringify(characterList), { parser: "json" })
      );
      const firstChar = characterList.items[0];
      const imageUrl = PocketBase.getImage(firstChar);
      const downloadedImage = await fetch(imageUrl);
      const buffer = Buffer.from(await downloadedImage.arrayBuffer());
      const attachment = new AttachmentBuilder(buffer);
      attachment.setName(firstChar.image);

      message.reply({
        content,
        files: [attachment],
      });
      return;
    }
  }
}
