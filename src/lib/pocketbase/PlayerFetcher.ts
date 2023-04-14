import type { Player } from "../../types/Character";
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
    if (!player) {
      throw new Error("Could not create player");
    }
    return player;
  }

  public static async getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      const player = await this.findPlayer(playerId);
      return player;
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
        return this.createPlayer(playerId);
      }
      throw error;
    }
  }
}
