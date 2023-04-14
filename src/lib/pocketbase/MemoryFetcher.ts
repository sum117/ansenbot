import type { ListResult } from "pocketbase";

import type { Memory } from "../../types/Character";
import PocketBase from "./PocketBase";

export default class MemoryFetcher {
  public static async getAllMemories(): Promise<ListResult<Memory>> {
    const response = await PocketBase.getAllEntities<Memory>({
      entityType: "memories",
    });

    return response;
  }
}
