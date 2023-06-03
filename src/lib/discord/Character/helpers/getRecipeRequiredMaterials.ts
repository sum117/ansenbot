import { MATERIALS_NAMES } from "../../../../data/constants";
import type { Recipe, RecipeWithItem } from "../../../../types/Item";
import getSafeEntries from "../../../../utils/getSafeEntries";

export type RequiredMaterials = {
  [K in keyof typeof MATERIALS_NAMES]: number;
};
export default function getRecipeRequiredMaterials(
  recipe: Recipe | RecipeWithItem
): RequiredMaterials {
  return <RequiredMaterials>Object.fromEntries(
    getSafeEntries(MATERIALS_NAMES)
      .map(([key]) => {
        const cost = recipe[key];
        if (cost) {
          return [key, cost];
        }
      })
      .filter((entry): entry is [keyof typeof MATERIALS_NAMES, number] => Boolean(entry))
  );
}
