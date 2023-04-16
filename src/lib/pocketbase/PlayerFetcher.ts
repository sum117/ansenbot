// noinspection ES6MissingAwait

import type { Player } from "../../types/Character";
import { PocketBaseError } from "../../utils/Errors";
import PocketBase from "./PocketBase";

export default class PlayerFetcher {
  public static async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      const player = await this.findPlayer(playerId);
      if (!player) {
        await this.createPlayer(playerId);
      }
      return player;
    } catch (error) {
      throw new PocketBaseError("Could not get player by id and failed creating one.");
    }
  }

  private static findPlayer(playerId: Player["discordId"]): Promise<Player> {
    return PocketBase.getFirstListEntity<Player>({
      entityType: "players",
      filter: [`discordId="${playerId}"`, PocketBase.expand("characters")],
    });
  }

  private static createPlayer(playerId: Player["discordId"]): Promise<Player> {
    return PocketBase.createEntity<Player>({
      entityData: {
        discordId: playerId,
        characters: [],
        currentCharacterId: "",
        posts: [],
      },
      entityType: "players",
    });
  }
}
