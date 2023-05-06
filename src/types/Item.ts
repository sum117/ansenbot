import type { z } from "zod";

import type {
  consumableSchema,
  equipmentSchema,
  itemSchema,
  spellSchema,
} from "../schemas/characterSchema";

export type ConsumableItem = z.infer<typeof consumableSchema>;
export type EquipmentItem = z.infer<typeof equipmentSchema>;
export type SpellItem = z.infer<typeof spellSchema>;

export type BaseItem = z.infer<typeof itemSchema>;

export type ItemCollection = `${"consumables" | "equipments" | "spells"}(item)`;
export type ItemWithRole = BaseItem & {
  expand?: {
    [K in ItemCollection]: Array<Item>;
  };
};

export type Item = ConsumableItem | EquipmentItem | SpellItem;
