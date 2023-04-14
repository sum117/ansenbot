import PocketBase from "./PocketBase";
import { Memory } from "../../types/Character";
import { ListResult } from "pocketbase";

export default class MemoryFetcher {
  public static async getAllMemories(): Promise<ListResult<Memory>> {
    const response = await PocketBase.getAllEntities<Memory>({
      entityType: "memories",
    });

    return response;
  }
}
