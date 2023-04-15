import "dotenv/config";

import { dirname, importx } from "@discordx/importer";
import type { Interaction } from "discord.js";
import { IntentsBitField, Options } from "discord.js";
import { Client } from "discordx";

import PostFetcher from "./lib/pocketbase/PostFetcher";
import server from "./server";

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
  bot.executeCommand(message);
});

bot.on("messageDelete", (message) => {
  if (message.embeds.length && !message.partial) {
    try {
      void PostFetcher.deletePost(message);
    } catch (error) {
      console.error("Error deleting post", error);
    }
  }
});
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
run();
