import type { COLLECTIONS } from "../../data/constants";
import type {
  ConsumableItem,
  EquipmentItem,
  GachaItemBuilderResponse,
  Item,
  ItemWithRole,
  SpellItem,
} from "../../types/Item";
import type { CreateData } from "../../types/PocketBaseCRUD";
import PocketBase from "./PocketBase";

export class ItemFetcher {
  public static async createItemWithRef<T extends GachaItemBuilderResponse>(
    gachaResponse: T
  ): Promise<ItemWithRole | undefined> {
    const createdItemRef = await PocketBase.createEntity({
      entityType: "items",
      entityData: {
        name: gachaResponse.name,
        description: gachaResponse.description,
        type: gachaResponse.type,
      },
    });

    if (ItemFetcher.isEquipment(gachaResponse.item)) {
      await ItemFetcher.createEquipment({
        ...gachaResponse.item,
        ...gachaResponse.requirements,
        item: createdItemRef.id,
      });
    }

    if (ItemFetcher.isSpell(gachaResponse.item)) {
      await ItemFetcher.createSpell({
        ...gachaResponse.item,
        ...gachaResponse.requirements,
        item: createdItemRef.id,
      });
    }

    return ItemFetcher.getItemWithRole(createdItemRef.id);
  }

  public static createItemClone(data: Item): Promise<Item> {
    return PocketBase.createEntity<Item>({
      entityType: data.collectionName as keyof typeof COLLECTIONS,
      entityData: data,
    });
  }

  public static isGachaItemBuilderResponse(
    item: Item | CreateData<Item> | GachaItemBuilderResponse
  ): item is GachaItemBuilderResponse {
    return "requirements" in item;
  }
  public static isSpell(
    item: Item | CreateData<Item> | GachaItemBuilderResponse
  ): item is SpellItem {
    return "isBuff" in item;
  }

  public static isEquipment(
    item: Item | CreateData<Item> | GachaItemBuilderResponse
  ): item is EquipmentItem {
    return "isWeapon" in item;
  }

  public static createConsumable<T extends ConsumableItem>(item: CreateData<T>): Promise<T> {
    return PocketBase.createEntity<T>({ entityType: "consumables", entityData: item });
  }

  public static createEquipment<T extends EquipmentItem>(item: T): Promise<T> {
    return PocketBase.createEntity<T>({ entityType: "equipments", entityData: item });
  }
  public static createSpell<T extends SpellItem>(item: T): Promise<T> {
    return PocketBase.createEntity<T>({ entityType: "spells", entityData: item });
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
