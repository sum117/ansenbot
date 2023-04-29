import PocketBase from "./PocketBase";
import { BaseItem, Item, ItemWithRole } from "../../types/Item";

export class ItemFetcher {
  public static async getItemById<T extends BaseItem>(id: Item["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "items", id: id });
  }

  public static async getItemWithRole<T extends ItemWithRole>(
    id: Item["id"]
  ): Promise<ItemWithRole> {
    return PocketBase.getEntityById<T>({
      entityType: "items",
      id: id,
    });
  }
}
