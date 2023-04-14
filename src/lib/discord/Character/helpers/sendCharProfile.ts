import type { Message } from "discord.js";

import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import CharacterPost from "../classes/CharacterPost";

export default async function sendCharProfile(message: Message): Promise<Message> {
  const characterFetcher = new CharacterFetcher();
  const charactersData = await characterFetcher.getCharactersByPlayerId({
    page: 1,
    playerId: message.author.id,
  });
  const characterPost = new CharacterPost(charactersData.items[0]);
  const messageOptions = await characterPost.createMessageOptions({
    to: "profile",
  });

  return message.channel.send(messageOptions);
}
