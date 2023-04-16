import type { z } from "zod";

import type {
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

export type Character = z.infer<typeof fullCharacterSchema>;
export type Faction = z.infer<typeof factionSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type Post = z.infer<typeof postSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Race = z.infer<typeof raceSchema>;
export type Spec = z.infer<typeof specSchema>;

export type CredentialsArray = [
  string,
  "surname" | "name" | "personality" | "backstory" | "title" | "image",
  string
];
export type RelationFields =
  | Character
  | Faction
  | Memory
  | Post
  | Player
  | Skills
  | Status
  | Race
  | Spec;
