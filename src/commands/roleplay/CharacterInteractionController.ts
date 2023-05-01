import { ButtonComponent, Discord, SelectMenuComponent } from "discordx";
import characterInteractionForm from "../../lib/discord/UI/character/characterInteractionForm";
import {
  ButtonInteraction,
  ComponentType,
  Snowflake,
  StringSelectMenuInteraction,
} from "discord.js";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import battleInteractionAttackForm from "../../lib/discord/UI/battle/battleInteractionAttackForm";
import { BATTLE_INTERACTION_ID_REGEX, CHARACTER_INTERACTION_ID_REGEX } from "../../data/constants";
import battleInteractionHelpForm from "../../lib/discord/UI/battle/battleInteractionHelpForm";
import { equipmentDictionary, statusDictionary } from "../../data/translations";
import getSafeKeys from "../../utils/getSafeKeys";
import { ItemFetcher } from "../../lib/pocketbase/ItemFetcher";
import { Character } from "../../types/Character";
import CharacterCombat, {
  AttackTurnResult,
  BodyPart,
  SupportTurnResult,
} from "../../lib/discord/Character/classes/CharacterCombat";
import { CharacterManager } from "../../lib/discord/Character/classes/CharacterManager";
import handleError from "../../utils/handleError";
import TrackedInteraction from "../../utils/TrackedInteraction";
import deleteDiscordMessage from "../../utils/deleteDiscordMessage";
import battleInteractionDefenseForm from "../../lib/discord/UI/battle/battleInteractionDefenseForm";
import MultiForm from "../../lib/discord/UI/classes/MultiForm";

interface BaseTurnInteraction {
  targetId: Snowflake;
  action: "attack" | "help" | "defense";
  kind: string;
  spellId?: string;
}

interface AttackTurnInteraction extends BaseTurnInteraction {
  action: "attack";
  kind: "spell" | "pass" | "body" | "commit" | "flee";
  bodyPart?: BodyPart;
}

interface SupportTurnInteraction extends BaseTurnInteraction {
  action: "help";
  kind: "spell" | "pass" | "sacrifice";
}

interface DefenseTurnInteraction extends BaseTurnInteraction {
  action: "defense";
  kind: "dodge" | "block" | "flee" | "counter";
}

interface SelectMenuInteractionParameters {
  kind: AttackTurnInteraction["kind"] | Omit<SupportTurnInteraction["kind"], "sacrifice">;
  agent: Character;
  target: Character;
  interactionValue: string;
  bodyPart?: BodyPart;
}

interface BaseButtonInteractionParameters {
  kind: "commit" | "flee" | "sacrifice" | "dodge" | "block" | "counter" | "pass";
  agent: CharacterManager;
  target: CharacterManager;
}

interface AttackButtonInteractionParameters extends BaseButtonInteractionParameters {
  kind: "commit" | "flee" | "pass";
}

interface DefenseButtonInteractionParameters extends BaseButtonInteractionParameters {
  kind: "dodge" | "block" | "counter" | "flee";
}

type ButtonInteractionParameters =
  | AttackButtonInteractionParameters
  | DefenseButtonInteractionParameters;

type SelectMenuInteractionHandler = (
  interaction: StringSelectMenuInteraction,
  data: SelectMenuInteractionParameters
) => Promise<void>;

type ButtonInteractionHandler = (
  interaction: ButtonInteraction,
  data: ButtonInteractionParameters
) => Promise<void>;

type TurnInteraction = AttackTurnInteraction | SupportTurnInteraction;

@Discord()
export class CharacterInteractionController {
  private turn = new Map<Snowflake, TurnInteraction>();
  private trackedInteraction = new TrackedInteraction();

  @ButtonComponent({
    id: CHARACTER_INTERACTION_ID_REGEX,
  })
  async characterInteractionButton(interaction: ButtonInteraction) {
    try {
      let { action, agentId, targetId } = this.getInteractionCredentials(interaction);

      if (agentId === "null") {
        agentId = interaction.user.id;
      }
      const trackedInteraction = await this.trackedInteraction.getOrCreateTrackedInteraction(
        interaction,
        "character:interaction:open",
        true
      );

      if (interaction.user.id !== targetId && interaction.user.id !== agentId) {
        return trackedInteraction.editReply("❌ Você não está participando dessa interação.");
      }

      const { currentCharacter: agent } = await getRoleplayDataFromUserId(agentId);
      const { currentCharacter: target } = await getRoleplayDataFromUserId(targetId);

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
        case "help": {
          const helpForm = await battleInteractionHelpForm(agent, target);
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
  async battleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
    await this.handleBattleInteraction(interaction);
  }

  @ButtonComponent({
    id: BATTLE_INTERACTION_ID_REGEX,
  })
  async battleButtonInteraction(interaction: ButtonInteraction) {
    await this.handleBattleInteraction(interaction);
  }

  private async handleBattleInteraction(
    interaction: StringSelectMenuInteraction | ButtonInteraction
  ) {
    try {
      await interaction.deferReply({
        ephemeral: true,
      });
      const { action, agentId, targetId, kind } = this.getInteractionCredentials(interaction);
      if (!kind) {
        return;
      }

      const { currentCharacter: agent, characterManager: agentManager } =
        await getRoleplayDataFromUserId(agentId);
      const { currentCharacter: target, characterManager: targetManager } =
        await getRoleplayDataFromUserId(targetId);

      if (interaction.isStringSelectMenu()) {
        const interactionValue = interaction.values[0];
        const bodyPart = this.getBodyPart(interactionValue) ?? "chest";
        const selectMenuInteractionHandlers: Record<string, SelectMenuInteractionHandler> = {
          attack: this.handleSelectMenuAttackInteraction,
          help: this.handleSelectMenuHelpInteraction,
        };
        const selectMenuInteractionHandler = selectMenuInteractionHandlers[action];
        if (selectMenuInteractionHandler) {
          await selectMenuInteractionHandler.call(this, interaction, {
            kind,
            agent,
            target,
            bodyPart,
            interactionValue,
          });
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await interaction.deleteReply().catch(() => null);
        }
      } else if (interaction.isButton()) {
        const buttonInteractionHandlers: Record<string, ButtonInteractionHandler> = {
          attack: this.handleButtonAttackInteraction,
          defense: this.handleButtonDefenseInteraction,
        };
        const buttonInteractionHandler = buttonInteractionHandlers[action];
        if (buttonInteractionHandler) {
          await buttonInteractionHandler.call(this, interaction, {
            kind: kind as ButtonInteractionParameters["kind"],
            agent: agentManager,
            target: targetManager,
          });
        }
      }
    } catch (error) {
      handleError(interaction, error);
    }
  }

  private async handleButtonDefenseInteraction(
    interaction: ButtonInteraction,
    { kind, agent, target }: ButtonInteractionParameters
  ) {
    if (kind === "pass" || kind === "commit") {
      return;
    }
    const message = await this.resolveTurn(agent, target, kind);
    await interaction.channel?.send(message);
    await interaction.deleteReply().catch(() => null);
    void deleteDiscordMessage(interaction.message, 0);
  }

  private async resolveTurn(
    agent: CharacterManager,
    target: CharacterManager,
    kind: "flee" | "dodge" | "block" | "counter" | "pass" | "sacrifice" | "spell",
    isSupport = false
  ) {
    const combat = new CharacterCombat({ agent, target });
    const currentInteraction = this.turn.get(agent.character.playerId);

    let turnResult: AttackTurnResult | SupportTurnResult;
    let message: string;
    if (isSupport) {
      turnResult = (await combat.processTurn({
        isSupport: true,
        agentItemId: (currentInteraction as SupportTurnInteraction)?.spellId,
      })) as SupportTurnResult;
      message = this.getSupportResultMessage(
        kind as SupportTurnInteraction["kind"],
        turnResult,
        agent,
        target
      );
    } else {
      turnResult = (await combat.processTurn({
        defenseOption: kind as DefenseTurnInteraction["kind"],
        bodyPart: (currentInteraction as AttackTurnInteraction).bodyPart!,
        isSupport: false,
      })) as AttackTurnResult;
      message = this.getDefenseResultMessage(
        kind as DefenseTurnInteraction["kind"],
        turnResult,
        agent,
        target
      );
    }

    return message;
  }

  private getSupportResultMessage(
    kind: SupportTurnInteraction["kind"],
    turnResult: SupportTurnResult,
    agent: CharacterManager,
    target: CharacterManager
  ): string {
    const statusStringArray = turnResult.statusesReplenished
      .map((status) => statusDictionary[status as keyof typeof statusDictionary])
      .join(", ");
    const messages: Record<string, string> = {
      sacrifice: `🛡️ ${agent.character.name} sacrificou 1/3 de sua essência espiritual para proteger ${target.character.name}!`,
      spell: `🧙 ${agent.character.name} lançou um feitiço de buff em ${target.character.name}, recuperando ${turnResult.amount} de ${statusStringArray}!`,
    };

    return messages[kind];
  }

  private getDefenseResultMessage(
    kind: DefenseTurnInteraction["kind"],
    turnResult: AttackTurnResult,
    agent: CharacterManager,
    target: CharacterManager
  ): string {
    const messages: Record<string, string> = {
      dodge: `🦵 ${target.character.name} desviou do ataque de ${agent.character.name}, ignorando 75% do dano, perdendo apenas ${turnResult.damageDealt}!`,
      counter: `🤺 ${target.character.name} contra-atacou ${agent.character.name} com sucesso, causando ${turnResult.damageDealt} de dano!`,
      block: `🛡️ ${target.character.name} bloqueou o ataque de ${agent.character.name} com sucesso, ignorando 100% do dano!`,
      flee: `🏃 ${target.character.name} fugiu da batalha!`,
      counterKill: `🗡️ ${target.character.name} contra-atacou com sucesso e matou ${agent.character.name} com um golpe certeiro!`,
      kill: `☠️ ${agent.character.name} matou ${target.character.name} com um golpe certeiro!`,
      damage: `💥 ${agent.character.name} causou ${turnResult.damageDealt} de dano em ${target.character.name}!`,
    };

    if (turnResult.defenseSuccess && turnResult.isKillingBlow) {
      return messages.counterKill;
    }
    if (turnResult.defenseSuccess) {
      return messages[kind];
    }
    if (turnResult.isKillingBlow) {
      return messages.kill;
    }
    return messages.damage;
  }

  private async handleButtonAttackInteraction(
    interaction: ButtonInteraction,
    { kind, agent, target }: ButtonInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.character.playerId);
    if (currentInteraction && this.isAttackTurn(currentInteraction)) {
      const { spellId, kind, bodyPart, targetId } = currentInteraction;

      const agentPanel = this.trackedInteraction.cache.get(interaction.user.id);
      if (agentPanel) {
        void agentPanel.deleteReply().catch(() => null);
        this.trackedInteraction.cache.delete(interaction.user.id);
      }

      let message: MultiForm | string = "";
      if (kind === "flee") {
        message = await this.resolveTurn(agent, target, kind);
      } else if (kind === "pass") {
        message = `${agent.character.name} passou o turno!`;
      } else {
        message = await battleInteractionDefenseForm(agent.character, target.character);
      }

      await interaction.channel?.send(message);
      void deleteDiscordMessage(interaction.message, 0);
      void interaction.deleteReply().catch(() => null);
    }
  }

  private handleButtonHelpInteraction(interaction: ButtonInteraction) {}

  private getBodyPart(key: string): BodyPart | undefined {
    return this.isBodyPart(key) ? (key as BodyPart) : undefined;
  }

  private isAttackTurn(turn: TurnInteraction): turn is AttackTurnInteraction {
    return turn.action === "attack";
  }

  private async handleSelectMenuHelpInteraction(
    interaction: StringSelectMenuInteraction,
    { kind, agent, target, interactionValue }: SelectMenuInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.playerId);

    const helpHandlers: Record<
      string,
      (currentInteraction: TurnInteraction | undefined) => Promise<SupportTurnInteraction>
    > = {
      spell: this.getSpellHelpData.bind(this, interactionValue, target.playerId),
    };

    const helpHandler = helpHandlers[kind as SupportTurnInteraction["kind"]];
    if (helpHandler) {
      const updatedInteraction = await helpHandler(currentInteraction);
      this.turn.set(agent.playerId, updatedInteraction);
      await this.sendHelpInteractionReply(
        interaction,
        kind as SupportTurnInteraction["kind"],
        updatedInteraction
      );
    }
  }

  private async getSpellHelpData(
    interactionValue: string,
    targetId: Snowflake
  ): Promise<SupportTurnInteraction> {
    return {
      action: "help",
      kind: "spell",
      targetId,
      spellId: interactionValue,
    };
  }

  private async handleSelectMenuAttackInteraction(
    interaction: StringSelectMenuInteraction,
    { kind, agent, target, bodyPart, interactionValue }: SelectMenuInteractionParameters
  ) {
    const currentInteraction = this.turn.get(agent.playerId);

    const attackHandlers: Record<
      string,
      (currentInteraction: TurnInteraction | undefined) => AttackTurnInteraction
    > = {
      body: this.getBodyAttackData.bind(this, bodyPart!, target.playerId),
      spell: this.getSpellAttackData.bind(this, interactionValue, target.playerId),
    };

    const attackHandler = attackHandlers[kind as AttackTurnInteraction["kind"]];
    if (attackHandler) {
      const updatedInteraction = attackHandler(currentInteraction);
      this.turn.set(agent.playerId, updatedInteraction);
      await this.sendAttackInteractionReply(
        interaction,
        kind as AttackTurnInteraction["kind"],
        updatedInteraction
      );
    }
  }

  private async getSpellName(spellId?: string): Promise<string> {
    if (spellId) {
      const spell = await ItemFetcher.getSpell(spellId);
      return spell.expand.item.name;
    }
    return "";
  }

  private async sendHelpInteractionReply(
    interaction: StringSelectMenuInteraction,
    kind: SupportTurnInteraction["kind"],
    updatedInteraction: SupportTurnInteraction
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
    kind: AttackTurnInteraction["kind"],
    updatedInteraction: AttackTurnInteraction
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

  private getBodyAttackData(
    bodyPart: BodyPart,
    targetId: string,
    currentInteraction: TurnInteraction | undefined
  ): AttackTurnInteraction {
    return currentInteraction && this.isAttackTurn(currentInteraction)
      ? { ...currentInteraction, bodyPart }
      : { action: "attack", kind: "body", targetId, bodyPart };
  }

  private getSpellAttackData(
    spellId: string,
    targetId: string,
    currentInteraction: TurnInteraction | undefined
  ): AttackTurnInteraction {
    return currentInteraction && this.isAttackTurn(currentInteraction)
      ? { ...currentInteraction, spellId }
      : { action: "attack", kind: "spell", targetId, spellId };
  }

  private isBodyPart(key: string): key is BodyPart {
    return getSafeKeys(equipmentDictionary).includes(key as BodyPart);
  }

  private getInteractionCredentials({ customId }: ButtonInteraction | StringSelectMenuInteraction) {
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
