import type { ListResult } from "pocketbase";

import type { Recipe } from "../../types/Item";
import PocketBase from "./PocketBase";

export class RecipeFetcher {
  public static getPaginatedRecipes(page = 1): Promise<ListResult<Recipe>> {
    return PocketBase.getAllEntities<Recipe>({
      entityType: "recipes",
      quantity: 30,
      page,
    });
  }
}
