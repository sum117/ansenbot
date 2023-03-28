/* eslint-disable camelcase */
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

// import { CharacterPost } from "../lib/discord/Character/Embed";
// import { CharacterFetcher } from "../lib/pocketbase/Character";
// const characterFetcher = new CharacterFetcher();
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
    if (message.channel.id !== "1090234136951799818" || message.author.bot) {
      return;
    }

    // if (message.author.username.startsWith("sum117")) {
    //   const userId = message.author.id;
    //   const character = await characterFetcher.getCharactersByUserId({
    //     page: 1,
    //     userId,
    //   });
    //   if (character.items.length) {
    //     const char = new CharacterPost(character.items[0]);
    //     message.channel.send(
    //       await char.createMessageOptions({ to: "profile" })
    //     );
    //     return;
    //   }
    // }
    history = [...history, [message.content]];
    const response = await ansenGPT.call({
      chat_history: history,
      question: message.content,
    });
    console.log(response);
    await message.channel.sendTyping();
    await message.channel.send(response.text);
  }
}
