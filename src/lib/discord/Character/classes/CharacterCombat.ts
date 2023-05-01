import { CharacterManager } from "./CharacterManager";
import { Character, Status } from "../../../../types/Character";
import { EquipmentItem, SpellItem } from "../../../../types/Item";
import random from "lodash.random";
import { equipmentDictionary, skillsDictionary } from "../../../../data/translations";
import { equipmentSchema, spellSchema } from "../../../../schemas/characterSchema";
import { BotError } from "../../../../utils/Errors";

export type BodyPart = keyof Omit<typeof equipmentDictionary, "spells" | "amulet" | "rings">;

export interface BaseTurn {
  isSupport: boolean;
}

export interface AttackTurn extends BaseTurn {
  bodyPart: BodyPart;
  defenseOption: "dodge" | "block" | "flee" | "counter";
  isSupport: false;
}

export interface SupportTurn extends BaseTurn {
  agentItemId?: string;
  isSupport: true;
}

export type Turn = AttackTurn | SupportTurn;

export interface AttackTurnResult {
  defenseSuccess: boolean;
  damageDealt: number;
  isKillingBlow: boolean;
  status?: Status;
}

export interface SupportTurnResult {
  statusesReplenished: Array<string>;
  amount: number;
  status: Status;
}

export type TurnResult = AttackTurnResult | SupportTurnResult;

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

  public async processTurn(turn: Turn): Promise<TurnResult> {
    const agentItem = await this.getAgentItem();

    const targetItem = turn.isSupport
      ? undefined
      : await this.targetManager.getEquipmentItem(turn.bodyPart);

    if (turn.isSupport) {
      return this.applyReplenishEffect(spellSchema.parse(agentItem));
    }
    // Verifica se a ação de defesa teve sucesso
    const defenseSuccess = this.prepareDefense(turn.defenseOption);

    if (defenseSuccess) {
      // Se a defesa teve sucesso, o dano será reduzido de acordo com a opção de defesa
      switch (turn.defenseOption) {
        case "dodge":
          // Se esquivou com sucesso, o dano é reduzido em 75%
          agentItem.quotient *= 0.25;
          break;
        case "block":
          // Se bloqueou com sucesso, o dano é totalmente reduzido
          agentItem.quotient = 0;
          break;
        case "flee":
          // Se fugiu com sucesso, o dano é totalmente reduzido e o turno é encerrado. Os jogadores devem encerrar o combate.
          agentItem.quotient = 0;
          break;
        case "counter":
          // Se o contra-ataque teve sucesso, o dano é refletido de volta ao atacante
          const counterDamage = await this.resolveFinalDamage(targetItem, agentItem, true);
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
      agentItem,
      targetItem
    );

    return {
      defenseSuccess,
      damageDealt,
      isKillingBlow,
      status,
    };
  }

  public async applyReplenishEffect(item: SpellItem | undefined) {
    let statusesReplenished: Array<string> = [];
    if (!item) {
      // gives 1/3 of the health to the target
      const agentHealth = this.agent.expand.status.health;
      const targetHealth = this.target.expand.status.health;
      const finalHealQuotient = Math.floor(agentHealth / 3);
      const finalHealth = targetHealth + finalHealQuotient;
      return {
        statusesReplenished: ["health"],
        amount: finalHealQuotient,
        status: await this.targetManager.setStatus({
          ...this.target.expand.status,
          health: finalHealth,
        }),
      };
    }
    if (item.isBuff) {
      const finalBuffQuotient = this.calculateMultiplier(item);
      const statusesToReplenish = item.status;
      const statuses = this.target.expand.status;

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

  private async getAgentItem(spellId?: string): Promise<EquipmentItem | SpellItem> {
    if (spellId) {
      const spell = this.agentManager.character.expand.body.expand?.spells?.find(
        (spell) => spell.id === spellId
      );
      if (!spell) {
        throw new BotError("O feitiço não foi encontrado.");
      }
      return spell;
    }

    const leftArm = await this.agentManager.getEquipmentItem("leftArm");
    const rightArm = await this.agentManager.getEquipmentItem("rightArm");

    if (!leftArm && !rightArm) {
      throw new BotError("O personagem não possui armas equipadas para atacar.");
    }

    if (leftArm && rightArm) {
      const equipmentLeft = equipmentSchema.parse(leftArm);
      const equipmentRight = equipmentSchema.parse(rightArm);
      if (equipmentLeft.isWeapon && equipmentRight.isWeapon) {
        // Se o personagem possui duas armas equipadas, os danos são somados e o dano final é dividido por 1.25
        const finalDamage = (equipmentLeft.quotient + equipmentRight.quotient) / 1.25;
        return {
          ...equipmentLeft,
          quotient: finalDamage,
        };
      }
    }
    const equipment = equipmentSchema.parse(leftArm || rightArm);
    return equipment;
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
    attacker: SpellItem | EquipmentItem | undefined,
    defender: EquipmentItem | SpellItem | undefined,
    isCounter = false
  ) {
    const attackerFinalQuotient = attacker ? this.calculateMultiplier(attacker) : 0;
    const defenderFinalQuotient = defender ? this.calculateMultiplier(defender) : 0;

    const targetStatus = isCounter ? this.agent.expand.status : this.target.expand.status;
    const damageDealt = Math.max(attackerFinalQuotient - defenderFinalQuotient, 0);

    let isKillingBlow = false;

    if (attacker?.expand.item.type === "spell") {
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
