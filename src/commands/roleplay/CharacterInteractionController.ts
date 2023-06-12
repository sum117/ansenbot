import dedent from "dedent";
import type { ButtonInteraction, Snowflake, StringSelectMenuInteraction } from "discord.js";
import { bold } from "discord.js";
import { ButtonComponent, Discord, SelectMenuComponent } from "discordx";

import { BATTLE_INTERACTION_ID_REGEX, CHARACTER_INTERACTION_ID_REGEX } from "../../data/constants";
import { equipmentDictionary, skillsDictionary, statusDictionary } from "../../data/translations";
import CharacterCombat from "../../lib/discord/Character/classes/CharacterCombat";
import type { CharacterManager } from "../../lib/discord/Character/classes/CharacterManager";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import battleInteractionAttackForm from "../../lib/discord/UI/battle/battleInteractionAttackForm";
import battleInteractionDefenseForm from "../../lib/discord/UI/battle/battleInteractionDefenseForm";
import battleInteractionSupportForm from "../../lib/discord/UI/battle/battleInteractionSupportForm";
import characterInteractionForm from "../../lib/discord/UI/character/characterInteractionForm";
import type MultiForm from "../../lib/discord/UI/classes/MultiForm";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import type { SkillKey } from "../../types/Character";
import type {
  AttackTurnResult,
  BaseTurn,
  BodyPart,
  ButtonInteractionHandler,
  ButtonInteractionParameters,
  ButtonKind,
  DuelTurn,
  SelectMenuInteractionHandler,
  SelectMenuInteractionParameters,
  SelectMenuKind,
  SupportTurn,
  SupportTurnResult,
  Turn,
} from "../../types/Combat";
import deleteDiscordMessage from "../../utils/deleteDiscordMessage";
import { CombatError } from "../../utils/Errors";
import getSafeKeys from "../../utils/getSafeKeys";
import handleError from "../../utils/handleError";
import TrackedInteraction from "../../utils/TrackedInteraction";

@Discord()
export class CharacterInteractionController {
  public trackedInteraction = new TrackedInteraction();
  private turn = new Map<Snowflake, Turn>();

  @ButtonComponent({
    id: CHARACTER_INTERACTION_ID_REGEX,
  })
  async characterInteractionButton(interaction: ButtonInteraction): Promise<void> {
    try {
      const credentials = this.getInteractionCredentials(interaction);
      let { agentId } = credentials;
      const { action, targetId } = credentials;
      if (agentId === "null") {
        agentId = interaction.user.id;
      }
      const trackedInteraction = await this.trackedInteraction.getOrCreateTrackedInteraction(
        interaction,
        "character:interaction:open",
        true
      );

      if (interaction.user.id !== targetId && interaction.user.id !== agentId) {
        await trackedInteraction.editReply("❌ Você não está participando dessa interação.");
        return;
      }

      const { character: agent } = await getRoleplayDataFromUserId(agentId);
      const { character: target } = await getRoleplayDataFromUserId(targetId);

      switch (action) {
        case "open": {
          const interactionPanel = await characterInteractionForm(agent, target);
          await trackedInteraction.editReply(interactionPanel);
          break;
        }
        case "attack": {
          const attackForm = await battleInteractionAttackForm(agent, target);
          await trackedInteraction.editReply(attackForm);
          break;
        }
        case "support": {
          const helpForm = await battleInteractionSupportForm(agent, target);
          await trackedInteraction.editReply(helpForm);
          break;
        }
      }
    } catch (error) {
      handleError(interaction, error);
    }
  }

  @SelectMenuComponent({
    id: BATTLE_INTERACTION_ID_REGEX,
  })
  battleSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
    return this.handleBattleInteraction(interaction);
  }

  @ButtonComponent({
    id: BATTLE_INTERACTION_ID_REGEX,
  })
  battleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    return this.handleBattleInteraction(interaction);
  }

  private async handleBattleInteraction(
    interaction: StringSelectMenuInteraction | ButtonInteraction
  ) {
    try {
      await interaction.deferReply({
        ephemeral: true,
      });
      const { action, agentId, targetId, kind } = this.getInteractionCredentials(interaction);
      if (!kind || action === "open") {
        this.turn.delete(agentId);
        return;
      }

      const { characterManager: agentManager } = await getRoleplayDataFromUserId(agentId);
      const { characterManager: targetManager } = await getRoleplayDataFromUserId(targetId);

      const currentInteraction = this.turn.get(agentId);
      this.turn.set(
        agentId,
        currentInteraction ?? {
          kind,
          targetId,
          action,
        }
      );

      if (interaction.isStringSelectMenu()) {
        const interactionValue = interaction.values[0];
        const bodyPart = this.getBodyPart(interactionValue) ?? "chest";

        const selectMenuInteractionHandlers: Record<string, SelectMenuInteractionHandler> = {
          attack: this.handleSelectMenuAttackInteraction,
          support: this.handleSelectMenuSupportInteraction,
        };
        const selectMenuInteractionHandler = selectMenuInteractionHandlers[action];

        if (selectMenuInteractionHandler && !CharacterCombat.isButtonKind(kind)) {
          await selectMenuInteractionHandler.call(this, interaction, {
            kind,
            agent: agentManager,
            target: targetManager,
            bodyPart,
            interactionValue,
          });

          await new Promise((resolve) => {
            setTimeout(resolve, 5000);
          });

          await interaction.deleteReply().catch(() => null);
        }
      } else if (interaction.isButton()) {
        const buttonInteractionHandlers: Record<string, ButtonInteractionHandler> = {
          attack: this.handleButtonAttackInteraction,
          defense: this.handleButtonDefenseInteraction,
          support: this.handleButtonSupportInteraction,
        };
        const buttonInteractionHandler = buttonInteractionHandlers[action];
        if (buttonInteractionHandler && CharacterCombat.isButtonKind(kind)) {
          await buttonInteractionHandler.call(this, interaction, {
            kind,
            agent: agentManager,
            target: targetManager,
          });
        }
      }
    } catch (error) {
      if (error instanceof CombatError) {
        await interaction.message.delete().catch(() => null);
        await interaction.deleteReply().catch(() => null);
        await interaction.channel?.send(error.message).catch(() => null);
      }
      handleError(interaction, error);
    }
  }

  @DeleteAfter()
  private async handleButtonDefenseInteraction(
    interaction: ButtonInteraction,
    { kind, agent, target }: ButtonInteractionParameters
  ) {
    if (!CharacterCombat.isDefenseButtonKind(kind)) {
      return;
    }
    const currentInteraction = this.turn.get(agent.character.playerId);
    const message = await this.resolveTurn(agent, target, {
      kind,
      targetId: target.character.playerId,
      action: "defense",
      spellId: currentInteraction?.spellId,
    });

    await interaction.channel?.send(message);
  }

  @DeleteAfter({ deleteAgentPanel: true })
  private async handleButtonAttackInteraction(
    interaction: ButtonInteraction,
    { kind, agent, target }: ButtonInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.character.playerId);
    if (currentInteraction && this.isAttackTurn(currentInteraction)) {
      const turnOptions: Parameters<typeof this.resolveTurn>[2] = {
        kind,
        targetId: agent.character.playerId,
        action: "attack",
        bodyPart: "legs",
      };

      const handlers: Record<string, () => Promise<string | MultiForm> | string> = {
        // When the agent tries to flee, the target is the agent itself
        flee: this.resolveTurn.bind(this, target, agent, turnOptions),
        pass: () => `♻️ ${agent.character.name} passou o turno!`,
        form: battleInteractionDefenseForm.bind(this, agent.character, target.character),
      };
      let message = handlers[kind];
      if (!message) {
        message = handlers.form;
      }
      await interaction.channel?.send(await message());
    }
  }

  @DeleteAfter({ deleteAgentPanel: true })
  private async handleButtonSupportInteraction(
    interaction: ButtonInteraction,
    { kind, agent, target }: ButtonInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.character.playerId);
    if (
      currentInteraction &&
      CharacterCombat.isSupportTurn(currentInteraction) &&
      CharacterCombat.isSupportButtonKind(kind)
    ) {
      const message = await this.resolveTurn(agent, target, {
        kind,
        action: "support",
        targetId: target.character.playerId,
        spellId: currentInteraction.spellId,
      });
      await interaction.channel?.send(message);
    }
  }

  private async handleSelectMenuSupportInteraction(
    interaction: StringSelectMenuInteraction,
    { kind, agent, target, interactionValue }: SelectMenuInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.character.playerId);

    const supportHandlers: Record<string, (currentInteraction: Turn | undefined) => SupportTurn> = {
      spell: this.getSpellHelpData.bind(this, interactionValue, target.character.playerId),
    };

    const supportHandler = supportHandlers[kind];
    if (supportHandler && CharacterCombat.isSelectSupportKind(kind)) {
      const updatedInteraction = supportHandler(currentInteraction);
      this.turn.set(agent.character.playerId, updatedInteraction);
      const message = await this.resolveTurn(agent, target, {
        kind,
        action: "support",
        targetId: target.character.playerId,
        spellId: updatedInteraction.spellId,
      });
      await this.sendHelpInteractionReply(interaction, kind, updatedInteraction);
      await interaction.channel?.send(message);
    }
  }

  private async handleSelectMenuAttackInteraction(
    interaction: StringSelectMenuInteraction,
    { kind, agent, target, bodyPart, interactionValue }: SelectMenuInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.character.playerId);

    const attackHandlers: Record<string, (currentInteraction: Turn | undefined) => DuelTurn> = {
      body: this.getBodyAttackData.bind(this, bodyPart!, target.character.playerId),
      spell: this.getSpellAttackData.bind(this, interactionValue, target.character.playerId),
    };

    const attackHandler = attackHandlers[kind];
    if (attackHandler) {
      const updatedInteraction = attackHandler(currentInteraction);
      this.turn.set(agent.character.playerId, updatedInteraction);
      await this.sendAttackInteractionReply(interaction, kind, updatedInteraction);
    }
  }

  private async resolveTurn(
    agent: CharacterManager,
    target: CharacterManager,
    turn: Turn
  ): Promise<string> {
    this.turn.delete(agent.character.playerId);
    this.turn.delete(target.character.playerId);
    const combat = new CharacterCombat({ agent, target });
    let turnResult: AttackTurnResult | SupportTurnResult;
    let message: string;
    if (CharacterCombat.isSupportTurn(turn)) {
      turnResult = await combat.processTurn({
        action: turn.action,
        kind: turn.kind,
        spellId: turn.spellId,
        targetId: turn.targetId,
      });
      message = this.getSupportResultMessage(turn.kind, turnResult, agent, target);
    } else {
      turnResult = await combat.processTurn({
        action: turn.action,
        kind: turn.kind,
        spellId: turn.spellId,
        bodyPart: turn.bodyPart,
        targetId: turn.targetId,
      });
      message = this.getDefenseResultMessage(turn.kind, turnResult, agent, target);
    }

    return message;
  }

  private async sendHelpInteractionReply(
    interaction: StringSelectMenuInteraction,
    kind: SupportTurn["kind"],
    updatedInteraction: SupportTurn
  ) {
    const spellName = await this.getSpellName(updatedInteraction.spellId);
    const messageMapping: Record<string, string> = {
      spell: `Você utilizou ${spellName} no alvo para ajudá-lo.`,
      sacrifice: "✅ Você escolheu sacrificar parte da sua essência espiritual para ajudar o alvo.",
    };

    const message = messageMapping[kind];
    return interaction.editReply(message);
  }

  private async sendAttackInteractionReply(
    interaction: StringSelectMenuInteraction,
    kind: DuelTurn["kind"],
    updatedInteraction: DuelTurn
  ) {
    const spellName = await this.getSpellName(updatedInteraction.spellId);

    const messageMapping: Record<string, string> = {
      body: `✅ Parte do corpo selecionada para o ataque: ${
        equipmentDictionary[updatedInteraction.bodyPart!]
      }`,
      spell: `✅ Magia selecionada para o ataque: ${spellName}`,
    };

    const message = messageMapping[kind];
    return interaction.editReply(message);
  }

  private getSpellHelpData(interactionValue: string, targetId: Snowflake): SupportTurn {
    return {
      action: "support",
      kind: "spell",
      targetId,
      spellId: interactionValue,
    };
  }

  private getSpellAttackData(
    spellId: string,
    targetId: string,
    currentInteraction: Turn | undefined
  ): DuelTurn {
    return currentInteraction && this.isAttackTurn(currentInteraction)
      ? { ...currentInteraction, spellId }
      : { action: "attack", kind: "spell", targetId, spellId };
  }

  private getBodyAttackData(
    bodyPart: BodyPart,
    targetId: string,
    currentInteraction: Turn | undefined
  ): DuelTurn {
    return currentInteraction && this.isAttackTurn(currentInteraction)
      ? { ...currentInteraction, bodyPart }
      : { action: "attack", kind: "body", targetId, bodyPart };
  }

  private getDefenseResultMessage(
    kind: DuelTurn["kind"],
    turnResult: AttackTurnResult,
    agent: CharacterManager,
    target: CharacterManager
  ): string {
    const kindMessages: Record<string, string> = {
      dodge: `🦵 ${target.character.name} desviou do ataque de ${agent.character.name}, ignorando 75% do dano, perdendo apenas ${turnResult.damageDealt}!`,
      counter: `🤺 ${target.character.name} contra-atacou ${agent.character.name} com sucesso, causando ${turnResult.damageDealt} de dano!`,
      block: `🛡️ ${target.character.name} bloqueou o ataque de ${agent.character.name} com sucesso, ignorando 100% do dano!`,
      flee: `🏃 ${target.character.name} fugiu da batalha!`,
      counterKill: `🗡️ ${target.character.name} contra-atacou com sucesso e matou ${agent.character.name} com um golpe certeiro!`,
      kill: `☠️ ${agent.character.name} matou ${target.character.name} com um golpe certeiro usando ${turnResult.weaponUsed}!`,
      damage: `💥 ${agent.character.name} causou ${turnResult.damageDealt} de dano em ${target.character.name} com ${turnResult.weaponUsed}!`,
    };

    const equipmentTypesMessage = turnResult.equipmentTypes
      .filter((type): type is SkillKey => Boolean(type))
      .map((type) => skillsDictionary[type])
      .join(" **VS** ");

    const oddsMessage = dedent`\n\n# ${equipmentTypesMessage}\n\n${target.character.name} tinha:
    - ${bold(turnResult.odds.block.join("/"))} de chance de bloquear o ataque;
    - ${bold(turnResult.odds.dodge.join("/"))} de chance de desviar;
    - ${bold(turnResult.odds.counter.join("/"))} de chance de contra-atacar;
    - ${bold(turnResult.odds.flee.join("/"))} de chance de fugir da batalha.`;

    if (turnResult.defenseSuccess && turnResult.isKillingBlow) {
      return kindMessages.counterKill + oddsMessage;
    }
    if (turnResult.defenseSuccess) {
      return kindMessages[kind] + oddsMessage;
    }
    if (turnResult.isKillingBlow) {
      return kindMessages.kill + oddsMessage;
    }
    return kindMessages.damage + oddsMessage;
  }

  private getSupportResultMessage(
    kind: SupportTurn["kind"],
    turnResult: SupportTurnResult,
    agent: CharacterManager,
    target: CharacterManager
  ): string {
    const statusStringArray = turnResult.statusesReplenished
      .map((status) => statusDictionary[status])
      .join(", ");
    const messages: Record<string, string> = {
      sacrifice: `🛡️ ${agent.character.name} sacrificou 1/3 de sua essência espiritual para proteger ${target.character.name}!`,
      spell: `🧙 ${agent.character.name} lançou um feitiço de buff em ${target.character.name}, fazendo-o(a) recuperar ${turnResult.amount} de ${statusStringArray}!`,
      pass: `♻️ ${agent.character.name} passou o turno!`,
    };

    return messages[kind];
  }

  private async getSpellName(spellId?: string): Promise<string> {
    if (spellId) {
      const spell = await ItemFetcher.getSpell(spellId);
      return spell.expand.item.name;
    }
    return "";
  }

  private getBodyPart(key: string): BodyPart | undefined {
    return this.isBodyPart(key) ? key : undefined;
  }

  private getInteractionCredentials({ customId }: ButtonInteraction | StringSelectMenuInteraction) {
    const groups =
      customId.match(CHARACTER_INTERACTION_ID_REGEX)?.groups ??
      customId.match(BATTLE_INTERACTION_ID_REGEX)?.groups;

    if (!groups || !("action" in groups) || !("agentId" in groups) || !("targetId" in groups)) {
      throw new Error("Interação inválida para a ação de interação entre personagens.");
    }

    return {
      action: groups.action as BaseTurn["action"] | "open",
      agentId: groups.agentId as string,
      targetId: groups.targetId as string,
      kind: customId.startsWith("battle") ? (groups.kind as ButtonKind | SelectMenuKind) : null,
    };
  }

  private isBodyPart(key: string): key is BodyPart {
    return getSafeKeys(equipmentDictionary).includes(key as BodyPart);
  }

  private isAttackTurn(turn: Turn): turn is DuelTurn {
    return turn.action === "attack";
  }
}

function DeleteAfter({ deleteAgentPanel }: { deleteAgentPanel?: boolean } = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      interaction: ButtonInteraction | StringSelectMenuInteraction,
      args: any
    ) {
      if (deleteAgentPanel) {
        const controller = this as CharacterInteractionController;
        const agentPanel = controller.trackedInteraction.cache.get(interaction.user.id);
        if (agentPanel) {
          await agentPanel.deleteReply().catch(() => null);
          controller.trackedInteraction.cache.delete(interaction.user.id);
        }
      }
      await originalMethod.call(this, interaction, args);
      await deleteDiscordMessage(interaction.message, 0);
      await interaction.deleteReply().catch(() => null);
    };

    return descriptor;
  };
}
