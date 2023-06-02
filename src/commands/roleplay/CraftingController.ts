import type { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import type { ListResult } from "pocketbase";

import { CRAFTING_REGEX } from "../../data/constants";
import characterRecipeBrowserMessageOptions from "../../lib/discord/UI/character/characterRecipeBrowserMessageOptions";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import { RecipeFetcher } from "../../lib/pocketbase/RecipeFetcher";
import type { ItemWithRole, Recipe } from "../../types/Item";

type CraftingButtonHandler = {
  interaction: ButtonInteraction;
  playerId: string;
  itemRef: ItemWithRole;
  recipeId: string;
  page: string;
  recipes: ListResult<Recipe>;
  previousRecipe: Recipe;
  currentRecipe: Recipe;
  nextRecipe: Recipe;
};
@Discord()
export class CraftingController {
  @ButtonComponent({ id: CRAFTING_REGEX })
  async craftingButton(interaction: ButtonInteraction): Promise<void> {
    const { action, recipeId, playerId, page } = this.getCraftingCredentials(interaction);
    if (action === "open") {
      await interaction.deferReply();
    } else {
      await interaction.deferUpdate();
    }

    const { recipes, previousRecipe, currentRecipe, nextRecipe } = await this.getPaginatedRecipes(
      recipeId,
      page
    );
    const itemRef = await ItemFetcher.getItemWithRole(currentRecipe.item);

    const handlers = {
      open: this.handleOpen,
      // browse: this.handleBrowse,
      // craft: this.handleCraft,
      // next: this.handleNextPage,
      // previous: this.handlePreviousPage,
    };

    await handlers["open"]({
      interaction,
      playerId,
      itemRef,
      recipeId: recipeId === "null" ? currentRecipe.id : recipeId,
      page: page ?? "1",
      recipes,
      previousRecipe,
      currentRecipe,
      nextRecipe,
    });
  }

  private async handleOpen(data: CraftingButtonHandler) {
    const messageOptions = characterRecipeBrowserMessageOptions(
      data.recipes,
      data.itemRef,
      data.recipeId,
      data.previousRecipe,
      data.playerId,
      data.page,
      data.currentRecipe,
      data.nextRecipe
    );
    await data.interaction.editReply(messageOptions);
    return;
  }

  private async getPaginatedRecipes(recipeId: string, page = "1") {
    const recipes = await RecipeFetcher.getPaginatedRecipes(Number(page));

    const currentRecipe =
      recipes.items.find((recipe) => recipe.id === recipeId) ?? recipes.items.at(0);
    const currentRecipeIndex = recipes.items.findIndex((recipe) => recipe.id === recipeId) ?? 0;
    const previousRecipe = recipes.items.at(currentRecipeIndex - 1) ?? recipes.items.at(-1);
    const nextRecipe = recipes.items.at(currentRecipeIndex + 1) ?? recipes.items.at(0);

    if (!currentRecipe || !previousRecipe || !nextRecipe) {
      throw new Error("Não foi possível encontrar o ID do item anterior ou seguinte.");
    }

    return {
      recipes,
      currentRecipe,
      previousRecipe,
      nextRecipe,
    };
  }

  private getCraftingCredentials(interaction: ButtonInteraction) {
    const groups = interaction.customId.match(CRAFTING_REGEX)?.groups;
    if (!groups) {
      throw new Error("O Id dessa interação é inválido.");
    }
    return {
      action: groups.action as "info" | "craft" | "next" | "previous" | "open",
      recipeId: groups.recipeId as string,
      playerId: groups.playerId as string,
      page: groups.page as string | undefined,
    };
  }
}
