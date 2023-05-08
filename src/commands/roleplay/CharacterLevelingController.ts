import type { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";

import { CHARACTER_LEVELING_REGEX } from "../../data/constants";
import { skillsDictionary } from "../../data/translations";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import type { CharacterLevelingFormOptions } from "../../lib/discord/UI/character/characterLevelingForm";
import { characterLevelingForm } from "../../lib/discord/UI/character/characterLevelingForm";
import CharacterFetcher from "../../lib/pocketbase/CharacterFetcher";
import { skillsSchema } from "../../schemas/characterSchema";
import type { Character, Skills } from "../../types/Character";
import type { PocketBaseConstants } from "../../types/PocketBaseCRUD";
import { pocketbaseConstants } from "../../types/PocketBaseCRUD";
import { BotError } from "../../utils/Errors";
import getSafeEntries from "../../utils/getSafeEntries";
import handleError from "../../utils/handleError";
import TrackedInteraction from "../../utils/TrackedInteraction";

type SkillKey = keyof Omit<Skills, keyof PocketBaseConstants | "expand">;

@Discord()
export class CharacterLevelingController {
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({
    id: CHARACTER_LEVELING_REGEX,
  })
  async button(interaction: ButtonInteraction): Promise<void> {
    try {
      const { playerId, skillId, action } = this.getCredentials(interaction);

      const { character, characterManager } = await getRoleplayDataFromUserId(playerId);

      if (!CharacterFetcher.isOwner(interaction.user.id, playerId) && action !== "open") {
        throw new BotError(
          "Você não pode interagir com as habilidades de um personagem de outro jogador"
        );
      }

      const trackedInteraction = await this.trackedInteraction.getOrCreateTrackedInteraction(
        interaction,
        `character:leveling:${playerId}:open`
      );

      const skillsList = this.getValidSkillsList(character);
      const skillKeys = Array.from(skillsList.keys());

      const currentSkillIndex = skillId ? skillKeys.findIndex((key) => key === skillId) : 0;
      const currentSkillId = skillKeys.at(currentSkillIndex);
      const previousSkillId = skillKeys.at(currentSkillIndex - 1) ?? skillKeys.at(-1);
      const nextSkillId = skillKeys.at(currentSkillIndex + 1) ?? skillKeys.at(0);

      if (!previousSkillId || !nextSkillId || !currentSkillId) {
        return;
      }

      const formOptions: CharacterLevelingFormOptions = {
        character,
        previousSkillId,
        nextSkillId,
        skillIdToSelect: currentSkillId,
      };

      let leveled = false;
      switch (action) {
        case "level-one-time": {
          formOptions.character = await characterManager.levelUpSkill(currentSkillId);
          leveled = true;
          break;
        }
        case "level-ten-times": {
          formOptions.character = await characterManager.levelUpSkill(currentSkillId, 10);
          leveled = true;
          break;
        }
      }

      const form = characterLevelingForm(formOptions);
      if (leveled) {
        form.setMessageContent("✅ Habilidade Aprimorada com sucesso!");
      }

      await trackedInteraction.editReply(form);
      return;
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private getValidSkillsList(character: Character): Map<SkillKey, number> {
    const keysToRemove = new Set(["expand", ...Object.keys(pocketbaseConstants)]);
    const sanitizedSchema = skillsSchema.omit({
      expand: true,
      collectionId: true,
      id: true,
      updated: true,
      collectionName: true,
      created: true,
    });

    const orderedSkillKeys = sanitizedSchema.keyof();
    const isSkill = (key: string): key is SkillKey => {
      const isSkillKey = orderedSkillKeys.safeParse(key);
      return isSkillKey.success;
    };

    const skillsList = new Map(
      getSafeEntries(character.expand.skills)
        .filter(([key]) => !keysToRemove.has(key))
        .sort(([keyA], [keyB]) => {
          if (!isSkill(keyA) || !isSkill(keyB)) {
            throw new BotError("A lista de habilidades não é válida");
          }
          const skillA = skillsDictionary[keyA];
          const skillB = skillsDictionary[keyB];
          return skillA.localeCompare(skillB);
        })
    );

    const isOnlySkills = (
      skillsList: Map<string, unknown>
    ): skillsList is Map<SkillKey, number> => {
      const array = Array.from(skillsList.keys());
      return array.every(isSkill);
    };

    if (!isOnlySkills(skillsList)) {
      throw new BotError("A lista de habilidades não é válida");
    }

    return skillsList;
  }

  private getCredentials(interaction: ButtonInteraction) {
    const groups = interaction.customId.match(CHARACTER_LEVELING_REGEX)?.groups;
    if (!groups?.playerId || !groups?.action) {
      throw new BotError("Não foi possível obter os dados da interação");
    }

    return {
      playerId: groups.playerId,
      skillId: groups?.skillId,
      action: groups.action as "previous" | "next" | "level-one-time" | "level-ten-times" | "open",
    };
  }
}
