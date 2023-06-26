import type { ArgsOf, GuardFunction } from "discordx";

import config from "../../config.json" assert { type: "json" };

export function inChannel(
  channelId: keyof (typeof config)["channels"]
): GuardFunction<ArgsOf<"messageCreate">> {
  const guard: GuardFunction<ArgsOf<"messageCreate">> = async (
    [message]: ArgsOf<"messageCreate">,
    _client,
    next
  ) => {
    if (message.channelId === config.channels[channelId]) {
      await next();
    }
  };
  return guard;
}
