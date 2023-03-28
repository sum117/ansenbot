import type { ColorResolvable, Snowflake } from "discord.js";

type PocketBaseConstants =
  | "collectionId"
  | "collectionName"
  | "created"
  | "id"
  | "updated";
type CreateData<T> = T extends Character
  ? Omit<T, PocketBaseConstants> & { factionId: string; raceId: string }
  : Omit<T, PocketBaseConstants>;

type Character = {
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

type Expand = {
  faction: Faction;
  race: Race;
  skills: Skills;
  status: Status;
};

type Race = {
  characters: string[];
  collectionId: string;
  collectionName: string;
  color: ColorResolvable;
  created: string;
  id: string;
  name: string;
  updated: string;
};

type Faction = {
  characters: string[];
  collectionId: string;
  collectionName: string;
  created: string;
  id: string;
  name: string;
  updated: string;
};

type Status = {
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

type Skills = {
  character?: string;
  charisma: number;
  collectionId: string;
  collectionName: string;
  created: string;
  darkness: number;
  dexterity: number;
  discovery: number;
  fortitude: number;
  id: string;
  intelligence: number;
  order: number;
  stealth: number;
  strength: number;
  updated: string;
  vigor: number;
};

type RelationFields = Skills | Race | Faction | Status;
type AllowedEntityTypes = RelationFields | Character;

export {
  AllowedEntityTypes,
  Character,
  CreateData,
  Expand,
  Faction,
  Race,
  RelationFields,
  Skills,
  Status,
};

export * from "./PocketBaseCRUD";

