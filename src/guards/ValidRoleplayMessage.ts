import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import type { ArgsOf, GuardFunction } from "discordx";

import config from "../../config.json" assert { type: "json" };

function isClassicMember(message: Message): boolean {
  const classicRoleId = config.roles.classic;
  return message.member?.roles.cache.has(classicRoleId) ?? false;
}

export const ValidRoleplayMessage: GuardFunction<ArgsOf<"messageCreate">> = async (
  [message],
  _client,
  next
) => {
  const isNarratorPrefix = message.content.startsWith("#");

  if (
    !message.inGuild() ||
    !message.channel.parent ||
    isClassicMember(message) ||
    isNarratorPrefix
  ) {
    return;
  }
  if (
    message.channel.type === ChannelType.GuildText &&
    message.channel.parent.name.startsWith("RP")
  ) {
    await next();
  }
};
