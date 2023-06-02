import "dotenv/config";

import { dirname, importx } from "@discordx/importer";
import type { Interaction } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";
import EventSource from "eventsource";

import { COLLECTIONS } from "./data/constants";
import { channelSubscriptionCallback, pb } from "./lib/pocketbase/PocketBase";
import PostFetcher from "./lib/pocketbase/PostFetcher";
import server from "./server";

global.EventSource = EventSource as any;

// For testing purposes.
// const isBotOwner: GuardFunction<Interaction | Message> = async (
//   interaction: Message | Interaction,
//   _client,
//   next
// ) => {
//   if (interaction.member?.user.id === "969062359442280548") {
//     await next();
//   }
// };

export const bot = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],
  // guards: [isBotOwner],
  silent: false,
  simpleCommand: {
    prefix: "!",
  },
});

bot.once("ready", async () => {
  await bot.initApplicationCommands();
  console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on("messageCreate", (message) => {
  bot.executeCommand(message);
});

bot.on("messageDelete", async (message) => {
  if (message.embeds.length && !message.partial) {
    try {
      const foundPost = await PostFetcher.getPostByMessageId(message.id).catch(() => null);
      if (foundPost) {
        await PostFetcher.deletePost(message);
      }
    } catch (error) {
      console.error("Error deleting post", error);
    }
  }
});

await pb.collection(COLLECTIONS.channels).subscribe("*", channelSubscriptionCallback);

async function run() {
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);
  if (!process.env.DISCORD_BOT_TOKEN) {
    throw Error("Could not find DISCORD_BOT_TOKEN in your environment");
  }
  await bot.login(process.env.DISCORD_BOT_TOKEN);
}
run();
server.listen(8091, () => {
  console.log("Server started");
});
