import cors from "cors";
import { ChannelType } from "discord.js";
import express from "express";

import CharacterPost from "./lib/discord/UI/classes/CharacterPost";
import CharacterFetcher from "./lib/pocketbase/CharacterFetcher";
import PostFetcher from "./lib/pocketbase/PostFetcher";
import { bot } from "./main";

const server = express();

server.use(cors());
server.use(express.json());
server.post("/post", async (req: express.Request, res: express.Response) => {
  const channel = await bot.channels.fetch(req.body.channelId);
  if (channel?.type !== ChannelType.GuildText) {
    return res.status(400).send("Invalid channel");
  }
  try {
    const character = await CharacterFetcher.getCharacterById(req.body.characterId);
    const messageOptions = new CharacterPost(character).createMessageOptions({
      to: "message",
      embedContent: req.body.message,
    });
    const message = await channel.send(messageOptions);
    message.author.id = req.body.userId;
    const post = await PostFetcher.createPost(message);
    return res.status(200).send(JSON.stringify(post));
  } catch (error) {
    console.log(error);
    return res.status(500).send(JSON.stringify(error));
  }
});

export default server;
