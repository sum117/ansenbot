import type { Player } from "../../types/Character";
import { PocketBaseError } from "../../utils/Errors";
import PocketBase from "./PocketBase";

export default class PlayerFetcher {
  private static async findPlayer(playerId: Player["discordId"]): Promise<Player> {
    const player = await PocketBase.getFirstListEntity<Player>({
      entityType: "players",
      filter: [`discordId="${playerId}"`, PocketBase.expand("characters")],
    });

    return player;
  }

  private static async createPlayer(playerId: Player["discordId"]): Promise<Player> {
    const player = await PocketBase.createEntity<Player>({
      entityData: {
        discordId: playerId,
        characters: [],
        currentCharacterId: "",
        posts: [],
      },
      entityType: "players",
    });
    return player;
  }

  public static async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      const player = await this.findPlayer(playerId);
      if (!player) {
        this.createPlayer(playerId);
      }
      return player;
    } catch (error) {
      throw new PocketBaseError("Could not get player by id and failed creating one.");
    }
  }
}
