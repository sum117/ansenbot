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
  memory: string;
  spec: string;
  status: string;
  surname: string;
  title: string;
  updated: string;
  playerId: Snowflake;
};

export type Player = {
  characters: string[];
  discordId: Snowflake;
  currentCharacterId?: string;
  collectionId: string;
  collectionName: string;
  created: string;
  id: string;
  updated: string;
};

export type Expand = {
  faction?: Faction;
  memory?: Memory;
  race: Race;
  skills: Skills;
  status: Status;
  player: Player;
};

export type Memory = {
  characters: string[];
  icon: string;
  title: string;
  phrase: string;
  isActive: boolean;
  collectionId: string;
  collectionName: string;
  created: string;
  id: string;
  updated: string;
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

export type RelationFields = Skills | Race | Faction | Status | Player | Memory;
export type AllowedEntityTypes = RelationFields | Character;
