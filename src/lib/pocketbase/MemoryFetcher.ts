import type { ListResult } from "pocketbase";

import type { Memory } from "../../types/Character";
import PocketBase from "./PocketBase";

export default class MemoryFetcher {
  public static getAllMemories(): Promise<ListResult<Memory>> {
    return PocketBase.getAllEntities<Memory>({
      entityType: "memories",
    });
  }

  public static getMemoryById(memoryId: Memory["id"]): Promise<Memory> {
    return PocketBase.getEntityById<Memory>({
      entityType: "memories",
      id: memoryId,
    });
  }

  public static updateMemory(memory: Memory): Promise<Memory> {
    return PocketBase.updateEntity<Memory>({
      entityType: "memories",
      entityData: memory,
    });
  }
}
