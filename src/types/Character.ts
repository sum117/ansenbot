import type { z } from "zod";

import type {
  beastsSchema,
  createUpdateCharacterSchema,
  destinyMaidenSchema,
  factionSchema,
  fullCharacterSchema,
  memorySchema,
  playerSchema,
  postSchema,
  raceSchema,
  skillsSchema,
  specSchema,
  statusSchema,
} from "../schemas/characterSchema";
import { bodySchema, effectSchema, inventory } from "../schemas/characterSchema";
import { Properties } from "./Utils";
import { EquipmentItem, Item, SpellItem } from "./Item";
import { equipmentDictionary } from "../data/translations";

export type CreateUpdateCharacter = z.infer<typeof createUpdateCharacterSchema>;
export type Character = z.infer<typeof fullCharacterSchema>;
export type Faction = z.infer<typeof factionSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type Post = z.infer<typeof postSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Race = z.infer<typeof raceSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type Spec = z.infer<typeof specSchema>;
export type DestinyMaiden = z.infer<typeof destinyMaidenSchema>;
export type Beast = z.infer<typeof beastsSchema>;
export type Inventory = z.infer<typeof inventory>;
export type CharacterBody = z.infer<typeof bodySchema>;
export type CredentialsArray = [
  string,
  "surname" | "name" | "personality" | "backstory" | "title" | "image",
  string
];

export interface ICharacterManager {
  use: (consumableId: Inventory["id"]) => Promise<string>;
  sleep: (hours: number) => Promise<void>;

  heal: (amount: number) => Promise<void>;

  takeDamage: (damage: number) => Promise<void>;
  applyEffect: (effect: Effect) => Promise<void>;

  addXp: (amount: number) => Promise<number>;
  addSpirit: (amount: number) => Promise<number>;

  setStatus: (status: Status) => Promise<Status>;
  getStatuses: (statusId: Status["id"]) => Promise<Status>;
  getStatus: (statusKey: keyof Status) => Promise<Properties<Status>>;

  addMemory: (memoryId: Memory["id"]) => Promise<void>;
  removeMemory: (memoryId: Memory["id"]) => Promise<void>;
  getMemory: () => Promise<Memory>;
  // setBeast: (beast: Beast) => Promise<Beast>;
  // getBeast: () => Promise<Beast>;
  setInventoryItem: (item: Item) => Promise<Item>;
  getInventoryItem: (id: Inventory["id"]) => Item | undefined;
  getInventory: () => Inventory;

  setEquipment: (equipment: Item) => Promise<CharacterBody>;
  getEquipment: () => Promise<CharacterBody>;
  getEquipmentItem: (
    slot: keyof typeof equipmentDictionary
  ) => Promise<EquipmentItem | EquipmentItem[] | SpellItem[] | undefined>;
}
