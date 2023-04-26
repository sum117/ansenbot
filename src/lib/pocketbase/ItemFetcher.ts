import { InventoryItem, Item } from "../../types/Character";
import PocketBase from "./PocketBase";
import { ListResult } from "pocketbase";

export class ItemFetcher {
  public static async getItemById<T extends Item>(id: Item["id"]): Promise<T> {
    return PocketBase.getEntityById<T>({ entityType: "items", id: id });
  }

  public static async getCharacterInventory<T extends InventoryItem>(
    characterId: string,
    page = 1,
    amountPerPage = 10
  ): Promise<ListResult<T>> {
    const listResult = await PocketBase.getEntitiesByFilter<T>({
      entityType: "inventory",
      filter: [
        page,
        amountPerPage,
        { filter: `character="${characterId}"`, ...PocketBase.expand("item") },
      ],
    });

    return listResult;
  }
}
