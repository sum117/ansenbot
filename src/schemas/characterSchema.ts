import { z } from "zod";

const baseSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  created: z.string(),
  updated: z.string(),
});

const createCharacterSchema = z.object({
  name: z.string(),
  image: z.string(),
  surname: z.string(),
  gender: z.string(),
  age: z.number(),
  level: z.number(),
  spec: z.string(),
  reputation: z.number(),
  profession: z.string(),
  title: z.string(),
  personality: z.string(),
  appearance: z.string(),
  backstory: z.string(),
  skills: z.string(),
  status: z.string(),
  race: z.string(),
  faction: z.string(),
  memory: z.string(),
  playerId: z.string(),
  player: z.string(),
  posts: z.array(z.string()),
});

const baseCharacterSchema = baseSchema.extend({
  ...createCharacterSchema.shape,
});

const characterExpanded = z.object({
  characters: z.array(baseCharacterSchema),
});

const factionSchema = baseSchema.extend({
  name: z.string(),
  characters: z.array(z.string()),
  expand: characterExpanded.optional(),
});

const memoriesSchema = baseSchema.extend({
  icon: z.string(),
  title: z.string(),
  phrase: z.string(),
  isActive: z.boolean(),
  characters: z.array(z.string()),
  expand: characterExpanded.optional(),
});
const postsSchema = baseSchema.extend({
  content: z.string(),
  messageId: z.string(),
  player: z.string(),
  character: z.string(),
});

const playersSchema = baseSchema.extend({
  discordId: z.string(),
  characters: z.array(z.string()),
  currentCharacterId: z.string(),
  posts: z.array(z.string()),
  expand: z
    .object({
      posts: z.array(postsSchema),
    })
    .optional(),
});

const racesSchema = baseSchema.extend({
  name: z.string(),
  color: z.string(),
  characters: z.array(z.string()),
  expand: characterExpanded.optional(),
});

const skillsSchema = baseSchema.extend({
  vigor: z.number(),
  strength: z.number(),
  fortitude: z.number(),
  intelligence: z.number(),
  dexterity: z.number(),
  darkness: z.number(),
  order: z.number(),
  discovery: z.number(),
  stealth: z.number(),
  charisma: z.number(),
  character: z.string(),
  expand: z.object({
    character: baseCharacterSchema,
  }),
});

const statusSchema = baseSchema.extend({
  health: z.number(),
  stamina: z.number(),
  money: z.number(),
  character: z.string(),
  expand: z.object({
    character: baseCharacterSchema,
  }),
});

const fullCharacterSchema = baseCharacterSchema.extend({
  expand: z
    .object({
      faction: factionSchema.optional(),
      memories: memoriesSchema.optional(),
      posts: postsSchema,
      player: playersSchema,
      skills: skillsSchema,
      status: statusSchema,
      race: racesSchema,
    })
    .optional(),
});

export {
  baseCharacterSchema,
  baseSchema,
  characterExpanded,
  createCharacterSchema,
  factionSchema,
  fullCharacterSchema,
  memoriesSchema,
  playersSchema,
  postsSchema,
  racesSchema,
  skillsSchema,
  statusSchema,
};
