import type { ColorResolvable, Snowflake } from "discord.js";

export type Character = {
  age: number;
  appearance: string;
  backstory: string;
  collectionId: string;
  collectionName: string;
  created: string;
  expand: Expand;
  gender: string;
  id: string;
  image: string;
  level: number;
  name: string;
  personality: string;
  profession: string;
  skills: string;
  spec: string;
  status: string;
  surname: string;
  title: string;
  updated: string;
  userId: Snowflake;
};

export type Expand = {
  faction: Faction;
  race: Race;
  skills: Skills;
  status: Status;
};

export type Race = {
  characters: string[];
  collectionId: string;
  collectionName: string;
  color: ColorResolvable;
  created: string;
  id: string;
  name: string;
  updated: string;
};

export type Faction = {
  characters: string[];
  collectionId: string;
  collectionName: string;
  created: string;
  id: string;
  name: string;
  updated: string;
};

export type Status = {
  character?: string;
  collectionId: string;
  collectionName: string;
  created: string;
  health: number;
  id: string;
  money: number;
  stamina: number;
  updated: string;
};

export type Skills = {
  character?: string;
  charisma: number;
  collectionId: string;
  collectionName: string;
  created: string;
  darkness: number;
  dexterity: number;
  discovery: number;
  expand: Character;
  fortitude: number;
  id: string;
  intelligence: number;
  order: number;
  stealth: number;
  strength: number;
  updated: string;
  vigor: number;
};

export type RelationFields = Skills | Race | Faction | Status;
export type AllowedEntityTypes = RelationFields | Character;
