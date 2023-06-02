import mustache from "mustache";

import type { ItemWithRole, Recipe } from "../../../../types/Item";

export default function formatRecipe(
  itemRef: ItemWithRole,
  recipe: Recipe,
  isCurrent = false
): string {
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
    name: itemRef.name,
    cookingLevel: recipe.cookingLevel ? `🍳 ${recipe.cookingLevel}` : undefined,
    alchemyLevel: recipe.alchemyLevel ? `🧪 ${recipe.alchemyLevel}` : undefined,
    darknessLevel: recipe.darknessLevel ? `🌑 ${recipe.darknessLevel}` : undefined,
  });
}
