import type { Snowflake } from "discord.js";
import random from "lodash.random";
import shuffle from "lodash.shuffle";

import {
  ITEM_TYPES,
  MANA_COST_MULTIPLIER,
  MULTIPLIER_RANGES,
  QUOTIENT_RANGES,
  RARITY_IMAGES,
  REQUIREMENT_RANGES,
  STAMINA_COST_MULTIPLIER,
  STATUS_GIVEN_PER_RARITY_RANGE,
  STATUS_NAMES,
} from "../../../data/constants";
import { equipmentDictionary, skillsDictionary } from "../../../data/translations";
import type {
  EquipmentItem,
  GachaItemBuilderResponse,
  ItemRarity,
  ItemRequirementsProps,
  ItemStats,
  PartialRequirements,
  SpellItem,
} from "../../../types/Item";
import type { CreateData } from "../../../types/PocketBaseCRUD";
import { BotError } from "../../../utils/Errors";
import getSafeEntries from "../../../utils/getSafeEntries";
import getSafeKeys from "../../../utils/getSafeKeys";

export default class GachaItemBuilder {
  private playerCurrentItem = new Map<Snowflake, GachaItemBuilderResponse>();
  private itemTypes: Array<keyof typeof ITEM_TYPES> = getSafeKeys(ITEM_TYPES).filter(
    (type) => type !== "consumable"
  );

  public remove(userId: Snowflake): void {
    this.playerCurrentItem.delete(userId);
  }

  public get(userId: Snowflake): GachaItemBuilderResponse | undefined {
    const item = this.playerCurrentItem.get(userId);

    return item;
  }

  public roll(userId: Snowflake): GachaItemBuilderResponse {
    const item = this.generateGachaItem() as GachaItemBuilderResponse;
    this.playerCurrentItem.set(userId, item);
    return item;
  }

  private generateGachaItem() {
    const rarity = this.calculateItemRarity();
    const stats = this.getItemStats(rarity);
    const rarityImage = RARITY_IMAGES[rarity];
    const itemSkill = this.getItemSkill(stats.requirements);
    const itemType = this.itemTypes[random(0, this.itemTypes.length - 1)];

    switch (itemType) {
      case "equipment":
        return {
          item: this.generateEquipment(rarity, stats, itemSkill),
          rarityImage,
          type: itemType,
          requirements: stats.requirements,
        };
      case "spell":
        return {
          item: this.generateSpell(stats, itemSkill, rarity),
          rarityImage,
          type: itemType,
          requirements: stats.requirements,
        };
      default:
        throw new BotError("Could not find item type in GachaItemMaker.ts");
    }
  }
  private generateSpell(
    stats: ItemStats,
    itemSkill: keyof typeof skillsDictionary,
    rarity: ItemRarity
  ) {
    const { hasEnduranceCost, getCost, isHealingSpell, statusArray } = this.getRng(stats, rarity);

    const equipment: Partial<CreateData<SpellItem>> = {
      healthCost: hasEnduranceCost() ? getCost() : 0,
      manaCost: getCost() * MANA_COST_MULTIPLIER,
      staminaCost: hasEnduranceCost() ? getCost() * STAMINA_COST_MULTIPLIER : 0,
      isBuff: isHealingSpell,
      multiplier: stats.multiplier,
      quantity: 1,
      isEquipped: false,
      item: "",
      quotient: stats.quotient,
      slot: "spells",
      type: itemSkill,
      status: statusArray,
    };
    return equipment;
  }

  private generateEquipment(
    rarity: ItemRarity,
    stats: ItemStats,
    itemSkill: keyof typeof skillsDictionary
  ) {
    const equipment: Partial<CreateData<EquipmentItem>> = {
      isCursed: false,
      isEquipped: false,
      isWeapon: false,
      item: "",
      multiplier: stats.multiplier,
      quantity: 1,
      quotient: stats.quotient,
      slot: this.getItemSlot(),
      type: itemSkill,
      rarity,
    };
    return equipment;
  }

  private getRng(stats: ItemStats, rarity: ItemRarity) {
    const hasEnduranceCost = () => random(0, 100) <= 50;
    const getCost = () => random(1, stats.quotient);
    const isHealingSpell = random(0, 100) >= 80;
    const status = getSafeKeys(STATUS_NAMES);
    const statusArray = this.getStatusArray(status, rarity);
    return { hasEnduranceCost, getCost, isHealingSpell, statusArray };
  }

  private getStatusArray(status: Array<keyof typeof STATUS_NAMES>, rarity: ItemRarity) {
    const givenStatusQuantity = random(
      STATUS_GIVEN_PER_RARITY_RANGE[rarity][0],
      STATUS_GIVEN_PER_RARITY_RANGE[rarity][1]
    );
    return shuffle(status).slice(0, givenStatusQuantity);
  }

  private getItemSlot() {
    const slots = getSafeKeys(equipmentDictionary);
    return slots[random(0, slots.length - 1)];
  }

  private getItemSkill(requirements: PartialRequirements) {
    let highestRequirement: keyof PartialRequirements | undefined;
    for (const [skillName, requirement] of getSafeEntries(requirements)) {
      if (!requirement) {
        continue;
      }
      if (!highestRequirement) {
        highestRequirement = skillName;
      }
      const highestRequirementLevel = requirements[highestRequirement];

      if (highestRequirementLevel && requirement > highestRequirementLevel) {
        highestRequirement = skillName;
      }
    }
    if (!highestRequirement) {
      throw new BotError("Could not find highest requirement in GachaItemMaker.ts");
    }
    return highestRequirement;
  }

  private getItemStats(rarity: ItemRarity) {
    const quotient = this.calculateItemQuotient(rarity);
    const multiplier = this.calculateItemMultiplier(rarity);
    const requirements = this.calculateItemRequirements({ quotient, multiplier, rarity });
    return { quotient, multiplier, requirements };
  }

  private calculateItemRequirements({ quotient, multiplier, rarity }: ItemRequirementsProps) {
    const requirements: Partial<Record<keyof typeof skillsDictionary, number>> = {};
    const skillNames = getSafeKeys(skillsDictionary);

    for (let index = 0; index < 5; index++) {
      const randomSkill = skillNames[random(0, skillNames.length - 1)];
      const requirementLevel = this.calculateRequirementLevel({ quotient, multiplier, rarity });
      const randomSkillLevel = Math.min(requirementLevel, 99);
      requirements[randomSkill] = randomSkillLevel;
    }

    return requirements;
  }

  private calculateRequirementLevel({ rarity }: ItemRequirementsProps): number {
    return random(REQUIREMENT_RANGES[rarity][0], REQUIREMENT_RANGES[rarity][1]);
  }
  private calculateItemQuotient(rarity: ItemRarity): number {
    return random(QUOTIENT_RANGES[rarity][0], QUOTIENT_RANGES[rarity][1]);
  }

  private calculateItemMultiplier(rarity: ItemRarity): number {
    return random(MULTIPLIER_RANGES[rarity][0], MULTIPLIER_RANGES[rarity][1]);
  }

  private calculateItemRarity() {
    const randomChance = random(1, 100);
    return randomChance <= 50 ? "n" : randomChance <= 80 ? "r" : randomChance <= 95 ? "sr" : "ssr";
  }
}
