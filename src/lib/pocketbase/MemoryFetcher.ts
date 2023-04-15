import type { ListResult } from "pocketbase";

import type { Memory } from "../../types/Character";
import { PocketBaseError } from "../../utils/Errors";
import PocketBase from "./PocketBase";

export default class MemoryFetcher {
  public static async getAllMemories(): Promise<ListResult<Memory>> {
    try {
      const response = await PocketBase.getAllEntities<Memory>({
        entityType: "memories",
      });

      return response;
    } catch (error) {
      throw new PocketBaseError("Could not get all memories.");
    }
  }
}
