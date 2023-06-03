import { ButtonBuilder, ButtonStyle } from "discord.js";
import type { ListResult } from "pocketbase";

import { MATERIALS_NAMES } from "../../../../data/constants";
import type { RecipeWithItem } from "../../../../types/Item";
import getSafeEntries from "../../../../utils/getSafeEntries";
import type { CharacterManager } from "../../Character/classes/CharacterManager";
import MultiForm from "../classes/MultiForm";
import formatRecipe from "../helpers/formatRecipe";

export default function characterRecipeBrowserMessageOptions(
  recipes: ListResult<RecipeWithItem>,
  characterManager: CharacterManager,
  previousRecipe: RecipeWithItem,
  playerId: string,
  page: string,
  currentRecipe: RecipeWithItem,
  nextRecipe: RecipeWithItem
): MultiForm {
  const formattedRecipes = recipes.items.map((recipe) =>
    formatRecipe(recipe, recipe.id === currentRecipe.id)
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
        `character:crafting:previousPage:${currentRecipe.id}:${playerId}:${Math.min(
          recipes.page - 1,
          recipes.totalPages
        )}`
      )
      .setLabel("Página anterior")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏪"),
    new ButtonBuilder()
      .setCustomId(
        `character:crafting:nextPage:${currentRecipe.id}:${playerId}:${Math.min(
          recipes.page + 1,
          recipes.totalPages
        )}`
      )
      .setLabel("Página seguinte")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏩"),
  ];
  const materials = getSafeEntries(MATERIALS_NAMES).map(
    ([key, value]) => `${value}: ${characterManager.character.expand.status[key]}`
  );
  materials.unshift("Seus materiais:");

  return new MultiForm({
    title: "Produção de Consumíveis",
    description: ["Selecione um item para produzir."]
      .concat(materials.join("\n"), formattedRecipes.join("\n"))
      .join("\n\n"),
    controller: true,
    controlFields,
    fields,
  });
}
