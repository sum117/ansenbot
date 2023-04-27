import { z } from "zod";
import { consumableSchema, equipmentSchema, spellSchema } from "../schemas/characterSchema";

export type ConsumableItem = z.infer<typeof consumableSchema>;
export type EquipmentItem = z.infer<typeof equipmentSchema>;
export type SpellItem = z.infer<typeof spellSchema>;

export type Item = ConsumableItem | EquipmentItem | SpellItem;
