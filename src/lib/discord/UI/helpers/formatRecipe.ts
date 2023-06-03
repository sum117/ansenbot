import mustache from "mustache";

import type { RecipeWithItem } from "../../../../types/Item";

export default function formatRecipe(recipe: RecipeWithItem, isCurrent = false): string {
  const templateArgs = [];
  templateArgs.push(
    " | {{{cookingLevel}}} {{{alchemyLevel}}} {{{darknessLevel}}} {{{orderLevel}}}"
  );
  if (isCurrent) {
    templateArgs.unshift("**{{{name}}}**");
    templateArgs.push(" 💠");
  } else {
    templateArgs.unshift("{{{name}}}");
  }

  return mustache.render(templateArgs.join(" "), {
    name: recipe.expand.item.name,
    cookingLevel: recipe.cookingLevel ? `🍳 ${recipe.cookingLevel}` : undefined,
    alchemyLevel: recipe.alchemyLevel ? `🧪 ${recipe.alchemyLevel}` : undefined,
    darknessLevel: recipe.darknessLevel ? `🌑 ${recipe.darknessLevel}` : undefined,
  });
}
