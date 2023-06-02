import { ButtonBuilder, ButtonStyle } from "discord.js";
import type { ListResult } from "pocketbase";

import type { ItemWithRole, Recipe } from "../../../../types/Item";
import MultiForm from "../classes/MultiForm";
import formatRecipe from "../helpers/formatRecipe";

export default function characterRecipeBrowserMessageOptions(
  recipes: ListResult<Recipe>,
  itemRef: ItemWithRole,
  recipeId: string,
  previousRecipe: Recipe,
  playerId: string,
  page: string,
  currentRecipe: Recipe,
  nextRecipe: Recipe
): MultiForm {
  const formattedRecipes = recipes.items.map((recipe) =>
    formatRecipe(itemRef, recipe, recipe.id === recipeId)
  );
  const fields = [
    new ButtonBuilder()
      .setCustomId(`character:crafting:previous:${previousRecipe.id}:${playerId}:${page}`)
      .setLabel("Anterior")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬆️"),
    new ButtonBuilder()
      .setCustomId(`character:crafting:craft:${currentRecipe.id}:${playerId}:${page}`)
      .setLabel("Produzir")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔨"),
    new ButtonBuilder()
      .setCustomId(`character:crafting:info:${currentRecipe.id}:${playerId}:${page}`)
      .setLabel("Info")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("ℹ️"),
    new ButtonBuilder()
      .setCustomId(`character:crafting:next:${nextRecipe.id}:${playerId}:${page}`)
      .setLabel("Próximo")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬇️"),
  ];
  const controlFields = [
    new ButtonBuilder()
      .setCustomId(
        `character:crafting:browse:${currentRecipe.id}:${playerId}:${Math.min(
          recipes.page - 1,
          recipes.totalPages
        )}`
      )
      .setLabel("Página anterior")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏪"),
    new ButtonBuilder()
      .setCustomId(
        `character:crafting:browse:${currentRecipe.id}:${playerId}:${Math.min(
          recipes.page + 1,
          recipes.totalPages
        )}`
      )
      .setLabel("Página seguinte")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏩"),
  ];
  return new MultiForm({
    title: "Produção de Consumíveis",
    description: ["Selecione um item para produzir."].concat(formattedRecipes).join("\n"),
    controller: true,
    controlFields,
    fields,
  });
}
