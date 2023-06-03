import type { ListResult } from "pocketbase";

import type { Recipe, RecipeWithItem } from "../../types/Item";
import PocketBase from "./PocketBase";

export class RecipeFetcher {
  public static getRecipeById(recipeId: string): Promise<Recipe> {
    return PocketBase.getEntityById<Recipe>({ entityType: "recipes", id: recipeId });
  }
  public static getPaginatedRecipes(page = 1): Promise<ListResult<RecipeWithItem>> {
    return PocketBase.getAllEntities<Recipe>({
      entityType: "recipes",
      quantity: 15,
      page,
      expandFields: ["item"],
    }) as Promise<ListResult<RecipeWithItem>>;
  }
}
