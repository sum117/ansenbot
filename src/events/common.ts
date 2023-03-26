import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

import { CharacterPost } from "../lib/discord/Character/Embed";
import { CharacterFetcher } from "../lib/pocketbase/Character";

const characterFetcher = new CharacterFetcher();

@Discord()
export class Example {
  @On()
  async messageCreate(
    [message]: ArgsOf<"messageCreate">,
    _client: Client
  ): Promise<void> {
    if (message.author.username.startsWith("sum117")) {
      const userId = message.author.id;
      const character = await characterFetcher.getCharactersByUserId({
        page: 1,
        userId,
      });
      if (character.items.length) {
        const char = new CharacterPost(character.items[0]);
        message.channel.send(
          await char.createMessageOptions({ to: "profile" })
        );
        return;
      }
    }
  }
}
