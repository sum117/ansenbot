import PocketBase from "./PocketBase";
import { BaseItem, Item, ItemWithRole, SpellItem } from "../../types/Item";

export class ItemFetcher {
  public static async getItemById<T extends BaseItem>(id: Item["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "items", id: id });
  }

  public static async getSpell<T extends SpellItem>(id: SpellItem["id"]) {
    return PocketBase.getEntityById<T>({ entityType: "spells", id: id });
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
