import type { ButtonInteraction } from "discord.js";
import { ButtonComponent, Discord } from "discordx";

import { BATTLE_INTERACTION_ID_REGEX, CHARACTER_INTERACTION_ID_REGEX } from "../../data/constants";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import battleInteractionAttackForm from "../../lib/discord/UI/battle/battleInteractionAttackForm";
import battleInteractionHelpForm from "../../lib/discord/UI/battle/battleInteractionHelpForm";
import characterInteractionForm from "../../lib/discord/UI/character/characterInteractionForm";
import TrackedInteraction from "../../utils/TrackedInteraction";

@Discord()
export class CharacterInteractionController {
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({
    id: CHARACTER_INTERACTION_ID_REGEX,
  })
  async characterInteractionButton(interaction: ButtonInteraction): Promise<void> {
    const interactionCredentials = this.getInteractionCredentials(interaction);
    const { action, targetId } = interactionCredentials;

    if (interactionCredentials.agentId === "null") {
      interactionCredentials.agentId = interaction.user.id;
    }

    if (
      interaction.user.id !== targetId &&
      interaction.user.id !== interactionCredentials.agentId
    ) {
      interaction.reply("❌ Você não está participando dessa interação.");
      return;
    }

    const { currentCharacter: agent } = await getRoleplayDataFromUserId(
      interactionCredentials.agentId
    );
    const { currentCharacter: target } = await getRoleplayDataFromUserId(targetId);

    switch (action) {
      case "open": {
        const interactionPanel = await characterInteractionForm(agent, target);
        await interaction.reply(interactionPanel);
        break;
      }
      case "attack": {
        const attackForm = await battleInteractionAttackForm(agent, target);
        await interaction.reply(attackForm);
        break;
      }
      case "help": {
        const helpForm = await battleInteractionHelpForm(agent, target);
        await interaction.reply(helpForm);
        break;
      }
    }
  }

  private getInteractionCredentials({ customId }: ButtonInteraction) {
    const groups =
      customId.match(CHARACTER_INTERACTION_ID_REGEX)?.groups ??
      customId.match(BATTLE_INTERACTION_ID_REGEX)?.groups;

    if (!groups || !("action" in groups) || !("agentId" in groups) || !("targetId" in groups)) {
      throw new Error("Interação inválida para a ação de interação entre personagens.");
    }

    return {
      action: groups.action as "attack" | "help" | "open",
      agentId: groups.agentId as string,
      targetId: groups.targetId as string,
      kind: customId.startsWith("battle")
        ? (groups.kind as "spell" | "sacrifice" | "pass" | "body" | "commit" | "flee")
        : null,
    };
  }
}
