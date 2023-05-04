import random from "lodash.random";

import type { skillsDictionary } from "../../../../data/translations";
import { spellSchema } from "../../../../schemas/characterSchema";
import type { Character } from "../../../../types/Character";
import type { EquipmentItem, SpellItem } from "../../../../types/Item";
import { BotError } from "../../../../utils/Errors";
import type { CharacterManager } from "./CharacterManager";

interface BaseTurn {
  agentItem: SpellItem | EquipmentItem;
}

export interface AttackTurn extends BaseTurn {
  targetItem: EquipmentItem;
  defenseOption: "dodge" | "block" | "flee" | "counter";
  isSupport: false;
}

export interface SupportTurn extends BaseTurn {
  agentItem: SpellItem;
  isSupport: true;
}

export default class CharacterCombat {
  public agent: Character;
  public target: Character;
  private agentManager: CharacterManager;
  private targetManager: CharacterManager;

  public constructor({ agent, target }: { agent: CharacterManager; target: CharacterManager }) {
    this.agentManager = agent;
    this.targetManager = target;
    this.agent = agent.character;
    this.target = target.character;
  }

  public async processTurn(turn: AttackTurn | SupportTurn) {
    if (turn.isSupport) {
      return this.applyReplenishEffect(turn.agentItem);
    }
    // Verifica se a ação de defesa teve sucesso
    const defenseSuccess = this.prepareDefense(turn.defenseOption);

    if (defenseSuccess) {
      // Se a defesa teve sucesso, o dano será reduzido de acordo com a opção de defesa
      switch (turn.defenseOption) {
        case "dodge":
          // Se esquivou com sucesso, o dano é reduzido em 25%
          turn.agentItem.quotient *= 0.75;
          break;
        case "block":
          // Se bloqueou com sucesso, o dano é totalmente reduzido
          turn.agentItem.quotient = 0;
          break;
        case "flee":
          // Se fugiu com sucesso, o dano é totalmente reduzido e o turno é encerrado. Os jogadores devem encerrar o combate.
          turn.agentItem.quotient = 0;
          break;
        case "counter":
          // Se o contra-ataque teve sucesso, o dano é refletido de volta ao atacante
          const counterDamage = await this.resolveFinalDamage(
            turn.agentItem,
            turn.targetItem,
            true
          );
          return {
            defenseSuccess,
            damageDealt: counterDamage.damageDealt,
            isKillingBlow: counterDamage.isKillingBlow,
          };
          break;
        default:
          throw new BotError("Opção de defesa inválida.");
      }
    }

    // Calcula e aplica o dano final ao alvo
    const { status, damageDealt, isKillingBlow } = await this.resolveFinalDamage(
      turn.agentItem,
      turn.targetItem
    );

    return {
      defenseSuccess,
      damageDealt,
      isKillingBlow,
      status,
    };
  }

  public async applyReplenishEffect(item: SpellItem) {
    if (item.isBuff) {
      const finalBuffQuotient = this.calculateMultiplier(item);
      const statusesToReplenish = item.status;
      const statuses = this.target.expand.status;

      const statusesReplenished: Array<string> = [];
      for (const status of statusesToReplenish) {
        statuses[status] = statuses[status] + finalBuffQuotient;
        statusesReplenished.push(status);
      }
      return {
        statusesReplenished,
        amount: finalBuffQuotient,
        status: await this.targetManager.setStatus(statuses),
      };
    } else {
      throw new BotError("A ação não é benéfica.");
    }
  }

  private prepareDefense(defenseOption: "dodge" | "block" | "flee" | "counter"): boolean {
    const {
      expand: { status: targetStatus, skills: targetSkills },
    } = this.target;
    const {
      expand: { status: agentStatus, skills: agentSkills },
    } = this.agent;

    agentStatus.stamina = Math.max(agentStatus.stamina, 1);
    const dodgeChance = (targetStatus.stamina / agentStatus.stamina) * targetSkills.dexterity;
    const blockChance = (targetStatus.stamina / agentStatus.stamina) * targetSkills.fortitude;
    const fleeChance =
      (targetStatus.stamina / agentStatus.stamina) * (targetSkills.stealth - agentSkills.discovery);
    const counterChance =
      ((targetStatus.stamina / agentStatus.stamina) *
        (targetSkills.dexterity + targetSkills.strength)) /
      2;

    let success = false;

    switch (defenseOption) {
      case "dodge": {
        success = random(0, 100, true) < dodgeChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.25 : targetStatus.stamina * 0.5;
        break;
      }
      case "block": {
        if (!this.target.expand.body.expand?.leftArm.isWeapon) {
          success = random(0, 75, true) < blockChance;
          targetStatus.stamina -= success
            ? targetStatus.stamina * 0.25
            : targetStatus.stamina * 0.5;
        } else {
          throw new BotError("O personagem não está utilizando um escudo.");
        }
        break;
      }
      case "flee": {
        success = random(0, 100, true) < fleeChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.25 : targetStatus.stamina * 0.5;
        break;
      }
      case "counter": {
        success = random(0, 100, true) < counterChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.3 : targetStatus.stamina * 0.6;
        break;
      }
      default: {
        throw new BotError("Opção de defesa inválida.");
      }
    }

    return success;
  }

  private async resolveFinalDamage(
    attacker: SpellItem | EquipmentItem,
    defender: SpellItem | EquipmentItem,
    isCounter = false
  ) {
    const attackerFinalQuotient = this.calculateMultiplier(attacker);
    const defenderFinalQuotient = this.calculateMultiplier(defender);

    const targetStatus = isCounter ? this.agent.expand.status : this.target.expand.status;
    const damageDealt = Math.max(attackerFinalQuotient - defenderFinalQuotient, 0);

    let isKillingBlow = false;

    if (attacker.expand.item.type === "spell") {
      const spell = spellSchema.parse(attacker);
      const statusesToDamage = spell.status;
      for (const status of statusesToDamage) {
        targetStatus[status] = targetStatus[status] - damageDealt;
      }
    } else {
      const health = targetStatus.health - damageDealt;
      targetStatus.health = health;
    }

    if (targetStatus.health <= 0) {
      isKillingBlow = true;
    }

    const status = isCounter
      ? await this.agentManager.setStatus(targetStatus)
      : await this.targetManager.setStatus(targetStatus);

    return {
      damageDealt,
      isKillingBlow,
      status,
    };
  }

  private calculateMultiplier({ quotient, type, multiplier }: SpellItem | EquipmentItem) {
    const rngFactor = 0.2; // 20% de RNG
    const baseFactor = 1 - rngFactor; // 80% de base

    const skillLevel = this.getSkillLevel(type);

    // Ajusta o multiplicador com base no nível da habilidade
    const adjustedMultiplier = (multiplier * skillLevel) / 99;

    // Calcula a parte base do quociente final (80% do total)
    const baseValue = quotient * adjustedMultiplier * baseFactor;

    // Calcula a parte aleatória do quociente final (20% do total)
    const rngValue = quotient * adjustedMultiplier * rngFactor * random(0.5, 1.5, true);

    const finalQuotient = baseValue + rngValue;

    return finalQuotient;
  }

  private getSkillLevel(type: keyof typeof skillsDictionary) {
    const skill = this.agent.expand.skills[type];
    return skill;
  }
}
