// noinspection ES6MissingAwait

import type { Player } from "../../types/Character";
import PocketBase from "./PocketBase";

export default class PlayerFetcher {
  public static async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      const foundPlayer = await this.findPlayer(playerId);
      return foundPlayer;
    } catch (error) {
      const createdPlayer = await this.createPlayer(playerId);
      return createdPlayer;
    }
  }

  public static async setCurrentCharacter(playerId: string, characterId: string): Promise<Player> {
    const player = await this.getPlayerById(playerId);
    player.currentCharacterId = characterId;
    return PocketBase.updateEntity<Player>({
      entityData: player,
      entityType: "players",
    });
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
