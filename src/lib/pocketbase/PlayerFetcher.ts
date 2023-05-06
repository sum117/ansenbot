// noinspection ES6MissingAwait

import type { Player } from "../../types/Character";
import { BotError } from "../../utils/Errors";
import PocketBase from "./PocketBase";

export default class PlayerFetcher {
  public static getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      return this.findPlayer(playerId);
    } catch (error) {
      return this.createPlayer(playerId);
    }
  }

  public static async setCurrentCharacter(playerId: string, characterId: string): Promise<Player> {
    try {
      const player = await this.getPlayerById(playerId);
      player.currentCharacterId = characterId;
      return PocketBase.updateEntity<Player>({
        entityData: player,
        entityType: "players",
      });
    } catch (error) {
      throw new BotError("Could not set current character.");
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
