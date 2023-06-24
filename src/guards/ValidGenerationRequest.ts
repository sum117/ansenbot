import { ChannelType } from "discord.js";
import type { ArgsOf, GuardFunction } from "discordx";

import config from "../../config.json" assert { type: "json" };

/**
 *  Checks if the message is a valid image generation request
 */
export const ValidGenerationRequest: GuardFunction<ArgsOf<"messageCreate">> = async (
  [message],
  _client,
  next
) => {
  if (
    message.channel.type === ChannelType.GuildText &&
    message.channelId === config.channels.imageGen &&
    message.content.startsWith("```")
  ) {
    await next();
  }
};
