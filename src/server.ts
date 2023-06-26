import cors from "cors";
import { ChannelType } from "discord.js";
import express from "express";

import CharacterPost from "./lib/discord/UI/classes/CharacterPost";
import CharacterFetcher from "./lib/pocketbase/CharacterFetcher";
import PostFetcher from "./lib/pocketbase/PostFetcher";
import { bot } from "./main";
import logger from "./utils/loggerFactory";

const server = express();

server.use(cors());
server.use(express.json());

server.post("/post", async (req: express.Request, res: express.Response) => {
  const channel = await bot.channels.fetch(req.body.channelId);
  if (channel?.type !== ChannelType.GuildText) {
    res.status(400).send("Invalid channel");
    return;
  }
  try {
    const character = await CharacterFetcher.getCharacterById(req.body.characterId);
    const messageOptions = await new CharacterPost(character).createMessageOptions({
      to: "message",
      embedContent: req.body.message,
    });
    const message = await channel.send(messageOptions);
    message.author.id = req.body.userId;
    const post = await PostFetcher.createPost(message);
    logger.info(post);
    res.status(200).json(post);
  } catch (error) {
    logger.info(error);
    res.status(500).json(error);
  }
});

export default server;
