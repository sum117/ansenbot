import type { z } from "zod";

import type { ITEM_TYPES } from "../data/constants";
import type { skillsDictionary } from "../data/translations";
import type {
  consumableSchema,
  equipmentSchema,
  itemSchema,
  recipeSchema,
  spellSchema,
} from "../schemas/characterSchema";
import type { CreateData } from "./PocketBaseCRUD";

export type ConsumableItem = z.infer<typeof consumableSchema>;
export type EquipmentItem = z.infer<typeof equipmentSchema>;
export type SpellItem = z.infer<typeof spellSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type BaseItem = z.infer<typeof itemSchema>;

export type ItemCollection = `${"consumables" | "equipments" | "spells"}(item)`;
export type ItemWithRole = BaseItem & {
  expand?: {
    [K in ItemCollection]: Array<Item>;
  };
};

export type Item = ConsumableItem | EquipmentItem | SpellItem;
export type ItemRarity = "n" | "r" | "sr" | "ssr";
export type ItemRequirementsProps = {
  quotient: number;
  multiplier: number;
  rarity: ItemRarity;
};
export type PartialRequirements = Partial<Record<keyof typeof skillsDictionary, number>>;
export type ItemStats = {
  quotient: number;
  multiplier: number;
  requirements: PartialRequirements;
};
export type GachaItemBuilderResponse = {
  item: CreateData<EquipmentItem | SpellItem>;
  rarityImage: string;
  type: keyof typeof ITEM_TYPES;
  requirements: PartialRequirements;
  name?: string;
  description?: string;
};
export type GachaParam = "reroll" | "keep" | "modal";
