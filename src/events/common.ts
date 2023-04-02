/* eslint-disable camelcase */
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";

import sendCharProfile from "../lib/discord/Character/helpers/sendCharProfile";

@Discord()
export class Example {
  @On()
  messageCreate([message]: ArgsOf<"messageCreate">, _client: Client): void {
    if (!message.content.startsWith("!test")) {
      return;
    }
    void sendCharProfile(message);
  }
}
