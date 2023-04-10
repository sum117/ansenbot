import type { Message } from "discord.js";

import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import CharacterPostEmbed from "../classes/CharacterPostEmbed";

export default async function sendCharProfile(message: Message): Promise<Message> {
  const characterFetcher = new CharacterFetcher();
  const charactersData = await characterFetcher.getCharactersByUserId({
    page: 1,
    userId: message.author.id,
  });
  const characterPost = new CharacterPostEmbed(charactersData.items[0]);
  const messageOptions = await characterPost.createMessageOptions({
    to: "profile",
  });

  return message.channel.send(messageOptions);
}
