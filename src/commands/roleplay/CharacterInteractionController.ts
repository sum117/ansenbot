import { ButtonComponent, Discord } from "discordx";
import characterInteractionForm from "../../lib/discord/UI/character/characterInteractionForm";
import { ButtonInteraction } from "discord.js";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import TrackedInteraction from "../../utils/TrackedInteraction";
import battleInteractionAttackForm from "../../lib/discord/UI/battle/battleInteractionAttackForm";
import { BATTLE_INTERACTION_ID_REGEX, CHARACTER_INTERACTION_ID_REGEX } from "../../data/constants";
import battleInteractionHelpForm from "../../lib/discord/UI/battle/battleInteractionHelpForm";

@Discord()
export class CharacterInteractionController {
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({
    id: CHARACTER_INTERACTION_ID_REGEX,
  })
  async characterInteractionButton(interaction: ButtonInteraction) {
    let { action, agentId, targetId } = this.getInteractionCredentials(interaction);

    if (agentId === "null") {
      agentId = interaction.user.id;
    }

    if (interaction.user.id !== targetId && interaction.user.id !== agentId) {
      return interaction.reply("❌ Você não está participando dessa interação.");
    }

    const { currentCharacter: agent } = await getRoleplayDataFromUserId(agentId);
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
