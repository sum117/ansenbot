import { Player } from "../../types/Character";
import PocketBase from "./PocketBase";
import safePromise from "../../utils/safePromise";

export default class PlayerFetcher {
  private static async findPlayerOrThrow(playerId: Player["discordId"]): Promise<Player> {
    const [player, error] = await safePromise(
      PocketBase.getFirstListEntity<Player>({
        entityType: "players",
        filter: [`discordId="${playerId}"`, PocketBase.expand("characters")],
      })
    );

    if (error || !player) {
      throw new Error("Player not found");
    }

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

  public static getPlayerById(playerId: Player["discordId"]): Promise<Player> {
    try {
      return this.findPlayerOrThrow(playerId);
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
        return this.createPlayer(playerId);
      }
      throw error;
    }
  }
}
