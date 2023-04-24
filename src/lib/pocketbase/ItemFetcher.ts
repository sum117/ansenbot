import { Item } from "../../types/Character";
import PocketBase from "./PocketBase";

export class ItemFetcher {
  public static async getItemById<T extends Item>(id: Item["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "items", id: id });
  }
}
