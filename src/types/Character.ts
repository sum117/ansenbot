import type { z } from "zod";

import type {
  baseSchema,
  factionSchema,
  fullCharacterSchema,
  memoriesSchema,
  playersSchema,
  postsSchema,
  racesSchema,
  skillsSchema,
  statusSchema,
} from "../schemas/characterSchema";

export type CreateData<T> = z.infer<typeof baseSchema> & T;

export type Character = z.infer<typeof fullCharacterSchema>;
export type Faction = z.infer<typeof factionSchema>;
export type Memories = z.infer<typeof memoriesSchema>;
export type Posts = z.infer<typeof postsSchema>;
export type Player = z.infer<typeof playersSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Races = z.infer<typeof racesSchema>;

export type RelationFields =
  | Character
  | Faction
  | Memories
  | Posts
  | Player
  | Skills
  | Status
  | Races;
