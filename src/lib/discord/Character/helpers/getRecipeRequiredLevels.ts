import type { Recipe, RecipeWithItem } from "../../../../types/Item";

type RequiredLevels = {
  cooking: number;
  alchemy: number;
  darkness: number;
};
export default function getRecipeRequiredLevels(recipe: Recipe | RecipeWithItem): RequiredLevels {
  return {
    cooking: recipe.cookingLevel,
    alchemy: recipe.alchemyLevel,
    darkness: recipe.darknessLevel,
  };
}
