import { CharacterManager } from "./CharacterManager";
import { Character } from "../../../../types/Character";
import { EquipmentItem, SpellItem } from "../../../../types/Item";
import random from "lodash.random";
import { skillsDictionary, statusDictionary } from "../../../../data/translations";
import { equipmentSchema, spellSchema } from "../../../../schemas/characterSchema";
import { BotError } from "../../../../utils/Errors";
import {
  AttackTurnResult,
  ButtonAttackKind,
  ButtonDefenseKind,
  ButtonKind,
  ButtonSupportKind,
  DuelTurn,
  SelectMenuKind,
  SelectMenuSupportKind,
  SupportTurn,
  SupportTurnResult,
  Turn,
  TurnResult,
} from "../../../../types/Combat";
import { ItemFetcher } from "../../../pocketbase/ItemFetcher";

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

  public static isSupportTurn(turn: Turn): turn is SupportTurn {
    return turn.action === "support";
  }

  public static isSelectSupportKind(kind: SelectMenuKind): kind is SelectMenuSupportKind {
    return kind === "spell";
  }

  public static isDuelTurn(turn: Turn): turn is DuelTurn {
    return turn.action === "attack" || turn.action === "defense";
  }

  public static isDefenseButtonKind(kind: ButtonKind | SelectMenuKind): kind is ButtonDefenseKind {
    return kind === "flee" || kind === "dodge" || kind === "counter" || kind === "block";
  }

  public static isAttackButtonKind(kind: ButtonKind | SelectMenuKind): kind is ButtonAttackKind {
    return kind === "pass" || kind === "flee" || kind == "commit";
  }

  public static isSupportButtonKind(kind: ButtonKind | SelectMenuKind): kind is ButtonSupportKind {
    return kind === "pass" || kind === "sacrifice";
  }

  public static isButtonKind(kind: ButtonKind | SelectMenuKind): kind is ButtonKind {
    return (
      CharacterCombat.isDefenseButtonKind(kind) ||
      CharacterCombat.isAttackButtonKind(kind) ||
      CharacterCombat.isSupportButtonKind(kind)
    );
  }

  public async processTurn(turn: DuelTurn): Promise<AttackTurnResult>;
  public async processTurn(turn: SupportTurn): Promise<SupportTurnResult>;

  public async processTurn(turn: Turn): Promise<TurnResult> {
    const { item: agentItem, itemName } = await this.getAgentItem(turn.spellId);
    const targetItem = CharacterCombat.isDuelTurn(turn)
      ? await this.targetManager.getEquipmentItem(turn.bodyPart ?? "chest")
      : undefined;

    if (CharacterCombat.isSupportTurn(turn)) {
      let spell: SpellItem | undefined;
      if (turn.spellId) {
        spell = await ItemFetcher.getSpell(turn.spellId);
      }
      return this.resolveSupport(spell);
    }

    if (!CharacterCombat.isDefenseButtonKind(turn.kind)) {
      throw new BotError("Opção de defesa inválida.");
    }

    // Verifica se a ação de defesa teve sucesso
    const defenseSuccess = this.prepareDefense(turn.kind);

    if (defenseSuccess) {
      // Se a defesa teve sucesso, o dano será reduzido de acordo com a opção de defesa
      switch (turn.kind) {
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
          const counterDamage = await this.resolveDuel(targetItem, agentItem, true);
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
    const { status, damageDealt, isKillingBlow } = await this.resolveDuel(agentItem, targetItem);

    return {
      defenseSuccess,
      damageDealt,
      isKillingBlow,
      status,
      weaponUsed: itemName,
    };
  }

  public async resolveSupport(item: SpellItem | undefined) {
    let statusesReplenished: Array<keyof typeof statusDictionary> = [];
    if (!item) {
      // gives 1/3 of the health to the target
      const agentHealth = this.agent.expand.status.health;
      const targetHealth = this.target.expand.status.health;
      const finalHealQuotient = Math.floor(agentHealth / 3);
      const finalHealth = targetHealth + finalHealQuotient;
      statusesReplenished.push("health");
      return {
        statusesReplenished,
        amount: Math.ceil(finalHealQuotient),
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
        amount: Math.ceil(finalBuffQuotient),
        status: await this.targetManager.setStatus(statuses),
      };
    } else {
      throw new BotError("A ação não é benéfica.");
    }
  }

  private prepareDefense(defenseOption: ButtonDefenseKind): boolean {
    const {
      expand: { status: targetStatus, skills: targetSkills },
    } = this.target;
    const {
      expand: { status: agentStatus, skills: agentSkills },
    } = this.agent;

    agentStatus.stamina = Math.max(agentStatus.stamina, 1);
    const dodgeChance = (targetStatus.stamina / agentStatus.stamina) * targetSkills.dexterity;
    const blockChance = (targetStatus.stamina / agentStatus.stamina) * targetSkills.fortitude;
    const fleeQuotient = (targetStatus.stamina / agentStatus.stamina) * targetSkills.stealth;
    const discoveryQuotient = (targetStatus.stamina / agentStatus.stamina) * agentSkills.discovery;
    const fleeChance = (fleeQuotient / (fleeQuotient + discoveryQuotient)) * 100;
    const counterChance =
      ((targetStatus.stamina / agentStatus.stamina) *
        (targetSkills.dexterity + targetSkills.strength)) /
      2;

    const dodgeRandom = random(0, 100, true);
    const blockRandom = random(0, 75, true);
    const fleeRandom = random(0, 100, true);
    const counterRandom = random(0, 100, true);

    console.log(
      "dodgeChance",
      dodgeChance,
      "dodgeRandom",
      dodgeRandom,
      "blockChance",
      blockChance,
      "blockRandom",
      blockRandom,
      "fleeChance",
      fleeChance,
      "fleeRandom",
      fleeRandom,
      "counterChance",
      counterChance,
      "counterRandom",
      counterRandom
    );
    let success = false;

    switch (defenseOption) {
      case "dodge": {
        success = dodgeRandom < dodgeChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.05 : targetStatus.stamina * 0.1;
        break;
      }
      case "block": {
        if (!this.target.expand.body.expand?.leftArm.isWeapon) {
          success = blockRandom < blockChance;
          targetStatus.stamina -= success
            ? targetStatus.stamina * 0.1
            : targetStatus.stamina * 0.15;
        } else {
          throw new BotError("O personagem não está utilizando um escudo.");
        }
        break;
      }
      case "flee": {
        success = fleeRandom < fleeChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.15 : targetStatus.stamina * 0.25;
        break;
      }
      case "counter": {
        success = counterRandom < counterChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.1 : targetStatus.stamina * 0.2;
        break;
      }
      default: {
        throw new BotError("Opção de defesa inválida.");
      }
    }

    return success;
  }

  private async resolveDuel(
    attacker: SpellItem | EquipmentItem | undefined,
    defender: EquipmentItem | SpellItem | undefined,
    isCounter = false
  ) {
    const attackerFinalQuotient = attacker ? this.calculateMultiplier(attacker) : 0;
    const defenderFinalQuotient = defender ? this.calculateMultiplier(defender) : 0;

    const targetStatus = isCounter ? this.agent.expand.status : this.target.expand.status;
    const damageDealt = Math.ceil(Math.max(attackerFinalQuotient - defenderFinalQuotient, 0));
    console.log("attackerFinalQuotient", attackerFinalQuotient);
    console.log("defenderFinalQuotient", defenderFinalQuotient);
    console.log("damage dealt", damageDealt);

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

  private async getAgentItem(
    spellId?: string
  ): Promise<{ item: EquipmentItem | SpellItem; itemName: string }> {
    if (spellId) {
      const spell = this.agentManager.character.expand.body.expand?.spells?.find(
        (spell) => spell.id === spellId
      );
      if (!spell) {
        throw new BotError("O feitiço não foi encontrado.");
      }
      return {
        item: spellSchema.parse(spell),
        itemName: spell.expand.item.name,
      };
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
          item: {
            ...equipmentLeft,
            quotient: finalDamage,
          },
          itemName: `${equipmentLeft.expand.item.name} e ${equipmentRight.expand.item.name}`,
        };
      }
    }
    const equipment = equipmentSchema.parse(leftArm || rightArm);
    return {
      item: equipment,
      itemName: equipment.expand.item.name,
    };
  }

  private getSkillLevel(type: keyof typeof skillsDictionary) {
    const skill = this.agent.expand.skills[type];
    return skill;
  }

  private calculateMultiplier({ quotient, type, multiplier }: SpellItem | EquipmentItem) {
    const rngFactor = 0.2; // 20% de RNG
    const baseFactor = 1 - rngFactor; // 80% de base

    const skillLevel = this.getSkillLevel(type);

    // Ajusta o multiplicador com base no nível da habilidade
    const adjustedMultiplier = baseFactor + (multiplier * skillLevel) / 99;
    console.log("adjustedMultiplier", adjustedMultiplier);
    // Calcula a parte base do quociente final (80% do total)
    const baseValue = quotient * adjustedMultiplier * baseFactor;

    // Calcula a parte aleatória do quociente final (20% do total)
    const rngValue = quotient * adjustedMultiplier * rngFactor * random(0.5, 1.5, true);

    const finalQuotient = baseValue + rngValue;
    console.log("baseValue", baseValue, "rngValue", rngValue, "finalQuotient", finalQuotient);
    return finalQuotient;
  }
}
