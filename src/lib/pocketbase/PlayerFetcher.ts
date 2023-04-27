// noinspection ES6MissingAwait

import type { Player } from "../../types/Character";
import PocketBase from "./PocketBase";

export default class PlayerFetcher {
  public static async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      return this.findPlayer(playerId);
    } catch (error) {
      return this.createPlayer(playerId);
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
        currentCharacterId: "",
        posts: [],
      },
      entityType: "players",
    });
  }
}
