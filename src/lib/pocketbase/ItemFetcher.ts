import PocketBase from "./PocketBase";
import { Item } from "../../types/Item";

export class ItemFetcher {
  public static async getItemById<T extends Item>(id: Item["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "items", id: id });
  }
}
