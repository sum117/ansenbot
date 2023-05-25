import random from "lodash.random";

import type { skillsDictionary } from "../../../../data/translations";
import { statusDictionary } from "../../../../data/translations";
import { equipmentSchema, spellSchema } from "../../../../schemas/characterSchema";
import type { Character, Skills, Status } from "../../../../types/Character";
import type {
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
import type { EquipmentItem, SpellItem } from "../../../../types/Item";
import { CombatError } from "../../../../utils/Errors";
import getSafeEntries from "../../../../utils/getSafeEntries";
import { ItemFetcher } from "../../../pocketbase/ItemFetcher";
import type { CharacterManager } from "./CharacterManager";

export interface ResolvedSupportTurn {
  statusesReplenished: Array<keyof typeof statusDictionary>;
  amount: number;
  status: Status;
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
    const { item: agentItem, itemName } = await this.getWeapon({
      from: "agent",
      spellId: turn.spellId,
    });
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
      throw new CombatError("Opção de defesa inválida.");
    }

    // Verifica se a ação de defesa teve sucesso
    const defenseSuccess = this.prepareDefense(turn.kind);

    if (defenseSuccess.success) {
      // Se a defesa teve sucesso, o dano será reduzido conforme a opção de defesa
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
          const targetWeapon = await this.getWeapon({ from: "target" });
          console.log(targetWeapon.item);
          const counterDamage = await this.resolveDuel(targetWeapon.item, agentItem, true);
          return {
            defenseSuccess: defenseSuccess.success,
            damageDealt: counterDamage.damageDealt,
            isKillingBlow: counterDamage.isKillingBlow,
            odds: {
              ...defenseSuccess,
            },
          };
        default:
          throw new CombatError("Opção de defesa inválida.");
      }
    }

    // Calcula e aplica o dano final ao alvo
    const { status, damageDealt, isKillingBlow } = await this.resolveDuel(agentItem, targetItem);

    return {
      defenseSuccess: defenseSuccess.success,
      odds: {
        ...defenseSuccess,
      },
      damageDealt,
      isKillingBlow,
      status,
      weaponUsed: itemName,
    };
  }

  public async resolveSupport(item: SpellItem | undefined): Promise<ResolvedSupportTurn> {
    const statusesReplenished: Array<keyof typeof statusDictionary> = [];
    if (!item) {
      // gives 1/3 of the health to the target
      const agentHealth = this.agent.expand.status.health;
      const targetHealth = this.target.expand.status.health;
      const finalHealQuotient = Math.floor(agentHealth / 3);
      const finalHealth = targetHealth + finalHealQuotient;
      statusesReplenished.push("health");

      this.agentManager.setStatus({
        ...this.agent.expand.status,
        health: Math.max(agentHealth - finalHealQuotient, 1),
      });

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

      const deductedStatus = this.getDeductedStatus(item);

      this.agentManager.setStatus({
        ...this.agent.expand.status,
        ...deductedStatus,
      });

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
      throw new CombatError("A ação não é benéfica.");
    }
  }

  private getDeductedStatus(item: SpellItem) {
    const costs = {
      mana: item.manaCost,
      stamina: item.staminaCost,
      health: item.healthCost,
    };

    const deductedStatus = Object.fromEntries(
      getSafeEntries(this.agent.expand.status)
        .filter((entries): entries is [keyof typeof costs, number] => {
          return entries[0] in costs;
        })
        .map(([key, value]) => {
          const newValue = value - costs[key];
          if (newValue < 0) {
            throw new CombatError(
              `O personagem ${this.agent.name} não possui ${statusDictionary[key]} suficiente para usar o feitiço.`
            );
          }
          return [key, newValue];
        })
    );
    return deductedStatus;
  }

  private prepareDefense(
    defenseOption: ButtonDefenseKind
  ): AttackTurnResult["odds"] & { success: boolean } {
    const {
      expand: { status: targetStatus, skills: targetSkills },
    } = this.target;
    const {
      expand: { status: agentStatus, skills: agentSkills },
    } = this.agent;

    agentStatus.stamina = Math.max(agentStatus.stamina, 1);
    const dodgeChance = Math.max(
      Math.ceil(this.calculateDodgeChance(targetStatus, agentStatus, targetSkills)),
      0
    );
    const blockChance = Math.max(
      Math.ceil(this.calculateBlockChance(targetStatus, agentStatus, targetSkills)),
      0
    );
    const fleeChance = Math.max(
      Math.ceil(this.calculateFleeChance(targetStatus, agentSkills, targetSkills)),
      0
    );
    const counterChance = Math.max(
      Math.ceil(this.calculateCounterChance(targetStatus, agentStatus, targetSkills)),
      0
    );

    const dodgeRandom = random(0, 100);
    const blockRandom = random(0, 90);
    const fleeRandom = random(0, 100);
    const counterRandom = random(0, 100);
    let success = false;

    switch (defenseOption) {
      case "dodge": {
        success = dodgeRandom < dodgeChance;
        targetStatus.stamina -= success ? targetStatus.stamina * 0.05 : targetStatus.stamina * 0.1;
        break;
      }
      case "block": {
        if (!this.target.expand.body.expand?.leftArm?.isWeapon) {
          success = blockRandom < blockChance;
          targetStatus.stamina -= success
            ? targetStatus.stamina * 0.1
            : targetStatus.stamina * 0.15;
        } else {
          throw new CombatError("O personagem não está utilizando um escudo.");
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
        throw new CombatError("Opção de defesa inválida.");
      }
    }

    return {
      dodge: [dodgeChance, dodgeRandom],
      block: [blockChance, blockRandom],
      flee: [fleeChance, fleeRandom],
      counter: [counterChance, counterRandom],
      success,
    };
  }

  private async resolveDuel(
    attacker: SpellItem | EquipmentItem | undefined,
    defender: EquipmentItem | SpellItem | undefined,
    isCounter = false
  ) {
    const attackerFinalQuotient = attacker ? this.calculateMultiplier(attacker) : 0;
    const defenderFinalQuotient = defender ? this.calculateMultiplier(defender) : 1;
    const defenderPercentage = defenderFinalQuotient / 100;

    const damageToNegate = Math.ceil(Math.max(attackerFinalQuotient * defenderPercentage, 0));
    const damageDealt = Math.ceil(Math.max(attackerFinalQuotient - damageToNegate, 0));

    const targetStatus = isCounter ? this.agent.expand.status : this.target.expand.status;

    let isKillingBlow = false;
    if (attacker?.expand.item.type === "spell") {
      const spell = spellSchema.parse(attacker);
      const statusesToDamage = spell.status;
      const deductedAgentStatus = this.getDeductedStatus(spell);

      this.agentManager.setStatus({
        ...this.agent.expand.status,
        ...deductedAgentStatus,
      });

      for (const status of statusesToDamage) {
        targetStatus[status] = Math.max(targetStatus[status] - damageDealt, 0);
      }
    } else {
      targetStatus.health = Math.max(targetStatus.health - damageDealt, 0);
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

  private async getWeapon({
    spellId,
    from,
  }: {
    spellId?: string;
    from: "agent" | "target";
  }): Promise<{ item: EquipmentItem | SpellItem; itemName: string }> {
    const manager = from === "agent" ? this.agentManager : this.targetManager;
    if (spellId) {
      const spell = manager.character.expand.body.expand?.spells?.find(
        (spell) => spell.id === spellId
      );
      if (!spell) {
        throw new CombatError("O feitiço não foi encontrado.");
      }
      return {
        item: spellSchema.parse(spell),
        itemName: spell.expand.item.name,
      };
    }

    const leftArm = await manager.getEquipmentItem("leftArm");
    const rightArm = await manager.getEquipmentItem("rightArm");

    if (!leftArm && !rightArm) {
      throw new CombatError("O personagem não possui armas equipadas para atacar.");
    }

    if (leftArm && rightArm) {
      const equipmentLeft = equipmentSchema.parse(leftArm);
      const equipmentRight = equipmentSchema.parse(rightArm);
      if (equipmentLeft.isWeapon && equipmentRight.isWeapon) {
        // Se o personagem possui duas armas equipadas, os danos são somados e o dano final é dividido por 1,25
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
    return this.agent.expand.skills[type];
  }

  private calculateMultiplier({ quotient, type, multiplier }: SpellItem | EquipmentItem) {
    const rngFactor = 0.2; // 20% de RNG
    const baseFactor = 1 - rngFactor; // 80% de base

    const skillLevel = this.getSkillLevel(type);

    // Ajusta o multiplicador com base no nível da habilidade
    const adjustedMultiplier = baseFactor + (multiplier * skillLevel) / 99;
    // Calcula a parte base do quociente final (80% do total)
    const baseValue = quotient * adjustedMultiplier * baseFactor;

    // Calcula a parte aleatória do quociente final (20% do total)
    const rngValue = quotient * adjustedMultiplier * rngFactor * random(0.5, 1.5, true);

    const finalQuotient = baseValue + rngValue;
    return finalQuotient;
  }

  private calculateDodgeChance(
    targetStatus: Status,
    agentStatus: Status,
    targetSkills: Skills
  ): number {
    return targetSkills.dexterity / 2 + targetStatus.stamina / 10 - agentStatus.stamina / 20;
  }

  private calculateBlockChance(
    targetStatus: Status,
    agentStatus: Status,
    targetSkills: Skills
  ): number {
    return targetSkills.fortitude / 2 + targetStatus.stamina / 10 - agentStatus.stamina / 20;
  }

  private calculateFleeChance(
    targetStatus: Status,
    agentSkills: Skills,
    targetSkills: Skills
  ): number {
    const fleeQuotient = (targetStatus.stamina / 10) * targetSkills.stealth;
    const discoveryQuotient = (targetStatus.stamina / 10) * agentSkills.discovery;
    return (fleeQuotient / (fleeQuotient + discoveryQuotient)) * 100;
  }

  private calculateCounterChance(
    targetStatus: Status,
    agentStatus: Status,
    targetSkills: Skills
  ): number {
    const counterChance =
      (targetSkills.strength * 0.4 + targetSkills.dexterity * 0.4 + targetSkills.charisma * 0.1) *
      ((targetStatus.stamina * 0.8) / agentStatus.stamina);
    return counterChance;
  }
}
