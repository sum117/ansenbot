import type { z } from "zod";

import type {
  beastsSchema,
  bodySchema,
  createUpdateCharacterSchema,
  destinyMaidenSchema,
  effectSchema,
  factionSchema,
  fullCharacterSchema,
  inventory,
  memorySchema,
  playerSchema,
  postSchema,
  raceSchema,
  skillsSchema,
  specSchema,
  statusSchema,
} from "../schemas/characterSchema";
import type { PocketBaseConstants } from "./PocketBaseCRUD";

export type CreateUpdateCharacter = z.infer<typeof createUpdateCharacterSchema>;
export type Character = z.infer<typeof fullCharacterSchema>;
export type Faction = z.infer<typeof factionSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type Post = z.infer<typeof postSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type SkillKey = keyof Omit<Skills, keyof PocketBaseConstants | "expand">;
export type Status = z.infer<typeof statusSchema>;
export type Race = z.infer<typeof raceSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type Spec = z.infer<typeof specSchema>;
export type DestinyMaiden = z.infer<typeof destinyMaidenSchema>;
export type Beast = z.infer<typeof beastsSchema>;
export type Inventory = z.infer<typeof inventory>;
export type InventoryKeys = "consumables" | "equipments" | "spells";

export type CharacterBody = z.infer<typeof bodySchema>;
export type CredentialsArray = [
  string,
  "surname" | "name" | "personality" | "backstory" | "title" | "image",
  string
];

export type StatusBar = {
  emoji: string;
  color: string;
};
export type TCharacterLeveling = {
  level?: number;
  xp?: number;
  characterSpareSkillPoints?: number;
  characterAscendedSkills?: string[];
  skillTraits?: string[];
};

export type SanitizedSkill = Partial<
  Omit<Skills, keyof PocketBaseConstants | "character" | "expand">
>;
