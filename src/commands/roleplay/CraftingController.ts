import type { ButtonInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { ButtonComponent, Discord } from "discordx";

import { CRAFTING_REGEX, MATERIALS_NAMES } from "../../data/constants";
import { skillsDictionary } from "../../data/translations";
import getRecipeRequiredLevels from "../../lib/discord/Character/helpers/getRecipeRequiredLevels";
import getRecipeRequiredMaterials from "../../lib/discord/Character/helpers/getRecipeRequiredMaterials";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import characterRecipeBrowserMessageOptions from "../../lib/discord/UI/character/characterRecipeBrowserMessageOptions";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import { RecipeFetcher } from "../../lib/pocketbase/RecipeFetcher";
import type { CraftingButtonHandler } from "../../types/Item";
import getSafeEntries from "../../utils/getSafeEntries";
import handleError from "../../utils/handleError";

@Discord()
export class CraftingController {
  @ButtonComponent({ id: CRAFTING_REGEX })
  async craftingButton(interaction: ButtonInteraction): Promise<void> {
    try {
      const { action, recipeId, playerId, page } = this.getCraftingCredentials(interaction);
      const { characterManager } = await getRoleplayDataFromUserId(playerId);
      if (action === "open" || action === "info") {
        await interaction.deferReply();
      } else {
        await interaction.deferUpdate();
      }

      const { recipes, previousRecipe, currentRecipe, nextRecipe } = await this.getPaginatedRecipes(
        recipeId,
        page
      );
      const itemRef = await ItemFetcher.getItemWithRole(currentRecipe.item);

      const data = {
        interaction,
        characterManager,
        playerId,
        itemRef,
        page: page ?? "1",
        recipes,
        previousRecipe,
        currentRecipe,
        nextRecipe,
      };

      const handlers = {
        info: this.handleInfo,
        craft: this.handleCraft,
      };

      switch (true) {
        case action in handlers:
          await handlers[action as keyof typeof handlers](data);
          break;
        default:
          await this.handleBrowse(data);
          break;
      }
    } catch (error) {
      interaction.deleteReply().catch(() => null);
      handleError(interaction, error);
    }
  }
  private async handleInfo(data: CraftingButtonHandler) {
    const levels = getRecipeRequiredLevels(data.currentRecipe);
    const levelsString = getSafeEntries(levels)
      .map(([key, value]) => {
        return `${skillsDictionary[key]}: ${value}`;
      })
      .join("\n");

    const materials = getRecipeRequiredMaterials(data.currentRecipe);
    const materialsString = getSafeEntries(materials)
      .map(([key, value]) => {
        return `${MATERIALS_NAMES[key]}: ${value}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`Informações sobre ${data.currentRecipe.expand.item.name}`)
      .setDescription(data.currentRecipe.expand.item.description)
      .setColor("Random")
      .addFields([
        { name: "Níveis necessários", value: levelsString, inline: true },
        { name: "Receita", value: materialsString, inline: true },
      ]);
    await data.interaction.editReply({ embeds: [embed] });
  }
  private async handleBrowse(data: CraftingButtonHandler) {
    const messageOptions = characterRecipeBrowserMessageOptions(
      data.recipes,
      data.characterManager,
      data.previousRecipe,
      data.playerId,
      data.page,
      data.currentRecipe,
      data.nextRecipe
    );
    await data.interaction.editReply(messageOptions);
    return;
  }

  private async handleCraft(data: CraftingButtonHandler) {
    const craft = await data.characterManager.craft(data.currentRecipe.id);
    await data.interaction.editReply({ content: craft, components: [], embeds: [] });
  }

  private async getPaginatedRecipes(recipeId: string, page = "1") {
    const recipes = await RecipeFetcher.getPaginatedRecipes(Number(page));

    const currentRecipe =
      recipes.items.find((recipe) => recipe.id === recipeId) ?? recipes.items.at(0);
    const currentRecipeIndex =
      recipes.items.findIndex((recipe) => recipe.id === recipeId) === -1
        ? 0
        : recipes.items.findIndex((recipe) => recipe.id === recipeId);

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
      action: groups.action as
        | "info"
        | "craft"
        | "next"
        | "previous"
        | "open"
        | "previousPage"
        | "nextPage",
      recipeId: groups.recipeId as string,
      playerId: groups.playerId as string,
      page: groups.page as string | undefined,
    };
  }
}
