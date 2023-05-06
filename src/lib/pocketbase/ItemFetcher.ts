import type { BaseItem, Item, ItemWithRole, SpellItem } from "../../types/Item";
import PocketBase from "./PocketBase";

export class ItemFetcher {
  public static getItemById<T extends BaseItem>(id: Item["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "items", id: id });
  }

  public static getSpell<T extends SpellItem>(id: SpellItem["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "spells", id: id });
  }

  public static getItemWithRole<T extends ItemWithRole>(id: Item["id"]): Promise<ItemWithRole> {
    return PocketBase.getEntityById<T>({
      entityType: "items",
      id: id,
    });
  }
}
