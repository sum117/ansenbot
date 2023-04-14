import type { TextChannel } from "discord.js";
import type { ArgsOf } from "discordx";
import { Discord, Once } from "discordx";

import config from "../../config.json" assert { type: "json" };
import { GameClock } from "../lib/discord/Character/classes/GameTime";
import CharacterFetcher from "../lib/pocketbase/CharacterFetcher";

@Discord()
export class OnReadyGameTimeManager {
  private _clock: GameClock | undefined;
  private _channel: TextChannel | undefined;

  get clock(): GameClock {
    if (!this._clock) {
      throw new Error("Clock not set");
    }
    return this._clock;
  }
  set clock(clock: GameClock) {
    this._clock = clock;
  }

  get channel(): TextChannel {
    if (!this._channel) {
      throw new Error("Channel not set");
    }
    return this._channel;
  }
  set channel(channel: TextChannel) {
    this._channel = channel;
  }

  @Once({ event: "ready" })
  async start([client]: ArgsOf<"ready">): Promise<void> {
    await this.syncStartTime();
    this.channel = (await client.channels.fetch(config.channels.gameTime)) as TextChannel;
    setInterval(() => {
      const time = this.clock.updateClock();
      console.log(`[GameTimeManager] ${time}`);
      this.channel.setName(`⏳ ${time}`);
    }, 6 * 60 * 1000);
  }

  async syncStartTime(): Promise<void> {
    const startTime = await CharacterFetcher.getFirstCharacterCreateDate();
    this.clock = new GameClock(8, startTime);
  }
}
