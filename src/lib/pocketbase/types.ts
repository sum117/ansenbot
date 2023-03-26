import type { Snowflake } from "discord.js";

export type CharacterData = {
  age: number;
  appearance: string;
  backstory: string;
  collectionId: string;
  collectionName: string;
  created: string;
  expand: Expand;
  faction: string;
  gender: string;
  id: string;
  image: string;
  level: number;
  name: string;
  personality: string;
  profession: string;
  race: string;
  skills: string;
  spec: string;
  status: string;
  surname: string;
  title: string;
  updated: string;
  userId: Snowflake;
};

export type CreateCharacterData = Omit<
  CharacterData,
  "collectionId" | "collectionName" | "created" | "expand" | "id" | "updated"
>;
export type Expand = {
  skills: Skills;
  status: Status;
};

type Status = {
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
