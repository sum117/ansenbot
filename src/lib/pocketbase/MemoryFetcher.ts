import type { ListResult } from "pocketbase";

import type { Memory } from "../../types/Character";
import PocketBase from "./PocketBase";

export default class MemoryFetcher {
  public static async getAllMemories(): Promise<ListResult<Memory>> {
    return await PocketBase.getAllEntities<Memory>({
      entityType: "memories",
    });
  }

  public static async getMemoryById(memoryId: Memory["id"]): Promise<Memory> {
    return await PocketBase.getEntityById<Memory>({
      entityType: "memories",
      id: memoryId,
    });
  }

  public static async updateMemory(memory: Memory): Promise<Memory> {
    return await PocketBase.updateEntity<Memory>({
      entityType: "memories",
      entityData: memory,
    });
  }
}
