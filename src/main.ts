import "dotenv/config";
import EventSource from "eventsource";

import { dirname, importx } from "@discordx/importer";
import type { Interaction } from "discord.js";
import { ChannelType, IntentsBitField, Options } from "discord.js";
import { Client } from "discordx";

import PostFetcher from "./lib/pocketbase/PostFetcher";
import server from "./server";
import { COLLECTIONS } from "./data/constants";
import { channelSubscriptionCallback, pb } from "./lib/pocketbase/PocketBase";

global.EventSource = EventSource as any;

export const bot = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],

  silent: false,
  simpleCommand: {
    prefix: "!",
  },
  makeCache: Options.cacheEverything(),
});

bot.once("ready", async () => {
  await bot.initApplicationCommands();
  console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on("messageCreate", (message) => {
  void bot.executeCommand(message);
});

bot.on("messageDelete", async (message) => {
  if (message.embeds.length && !message.partial) {
    try {
      const foundPost = await PostFetcher.getPostByMessageId(message.id);
      if (foundPost) {
        void PostFetcher.deletePost(message);
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

server.listen(8000, () => {
  console.log("Server started");
});
void run();
