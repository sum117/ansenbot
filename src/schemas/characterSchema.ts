import type { HexColorString } from "discord.js";
import { z } from "zod";

import baseSchema from "./baseSchema";

const createUpdateCharacterSchema = z.object(
  {
    name: z
      .string({
        required_error: "Você deve incluir o nome do personagem.",
      })
      .min(3, { message: "O nome do personagem deve ter pelo menos 3 caracteres." })
      .max(128, { message: "O nome do personagem deve ter no máximo 128 caracteres." }),
    surname: z
      .string({
        required_error: "Você deve incluir o sobrenome do personagem.",
      })
      .min(3, { message: "O sobrenome do personagem deve ter pelo menos 3 caracteres." })
      .max(64, { message: "O sobrenome do personagem deve ter no máximo 64 caracteres." }),
    image: z.string({
      required_error: "Você deve incluir um link de imagem para o personagem.",
    }),
    gender: z.string({
      required_error: "Você deve incluir o gênero do personagem.",
    }),
    age: z.number({
      required_error: "Você deve incluir a idade do personagem.",
    }),
    level: z.number({
      required_error: "Você deve incluir o nível do personagem.",
    }),
    spec: z.array(z.string(), {
      required_error: "Você deve incluir as classes do personagem.",
    }),
    reputation: z.number({
      required_error: "Você deve incluir a reputação do personagem.",
    }),
    profession: z
      .string()
      .max(128, { message: "A profissão do personagem deve ter no máximo 128 caracteres." })
      .optional(),
    title: z
      .string()
      .max(128, {
        message: "O título do personagem deve ter no máximo 128 caracteres.",
      })
      .optional(),
    personality: z
      .string()
      .max(1024, {
        message: "A personalidade do personagem deve ter no máximo 1024 caracteres.",
      })
      .optional(),
    appearance: z
      .string()
      .max(512, {
        message: "A aparência do personagem deve ter no máximo 512 caracteres.",
      })
      .optional(),
    backstory: z
      .string()
      .max(2048, {
        message: "A história do personagem deve ter no máximo 2048 caracteres.",
      })
      .optional(),
    skills: z.string({
      required_error: "Houve um erro ao criar as skills do personagem.",
    }),
    status: z.string({
      required_error: "Houe um erro ao criar o status do personagem.",
    }),
    race: z.array(z.string(), {
      required_error: "Você deve incluir as raças do personagem.",
    }),
    faction: z.string().optional(),
    memory: z.string().optional(),
    playerId: z.string(),
    destinyMaiden: z.string({
      required_error: "Houve um erro ao escolher a Donzela do Destino do personagem.",
    }),
    player: z.string({
      required_error: "Houve um erro ao escolher o jogador do personagem.",
    }),
    posts: z.array(z.string()),
    inventory: z.array(z.string()),
    xp: z.number(),
    skillPoints: z.number(),
    ascendedSkills: z.array(z.string()),
    skillTraits: z.array(z.string()),
  },
  {
    description: "Schema para criação e atualização de personagens.",
    required_error: "Você deve incluir todos os campos obrigatórios.",
  }
);

const baseCharacterSchema = baseSchema.extend({
  ...createUpdateCharacterSchema.shape,
});

const characterExpanded = z.object({
  characters: z.array(baseCharacterSchema),
});
const itemSchema = baseSchema.extend({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  hunger: z.number(),
  health: z.number(),
  stamina: z.number(),
  void: z.number(),
});

const inventoryItem = baseSchema.extend({
  item: z.string(),
  character: z.string(),
  amount: z.number(),
  isPoisoned: z.boolean(),
  isCooked: z.boolean(),
});

const factionSchema = baseSchema.extend({
  name: z.string(),
  characters: z.array(z.string()),
  image: z.string(),
  description: z.string(),
  expand: characterExpanded.optional(),
});

const memorySchema = baseSchema.extend({
  icon: z.string(),
  title: z.string(),
  phrase: z.string(),
  isActive: z.boolean(),
  characters: z.array(z.string()),
  expand: characterExpanded.optional(),
});
const postSchema = baseSchema.extend({
  content: z.string(),
  messageId: z.string(),
  player: z.string(),
  character: z.string(),
});

const playerSchema = baseSchema.extend({
  discordId: z.string(),
  characters: z.array(z.string()),
  currentCharacterId: z.string(),
  posts: z.array(z.string()),
  expand: z
    .object({
      posts: z.array(postSchema),
    })
    .optional(),
});

const raceSchema = baseSchema.extend({
  name: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i) as z.ZodType<HexColorString>,
  characters: z.array(z.string()),
  image: z.string(),
  description: z.string(),
  expand: characterExpanded.optional(),
});

const effectSchema = baseSchema.extend({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  duration: z.number(),
  amount: z.number(),
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
  character: z.string().optional(),
  expand: z.object({
    character: baseCharacterSchema,
  }),
});

const specSchema = baseSchema.extend({
  name: z.string(),
  description: z.string(),
  image: z.string(),
  characters: z.array(z.string()),
  startingSkills: z.array(z.string()),
  expand: characterExpanded
    .extend({
      startingSkills: skillsSchema.omit({ expand: true }),
    })
    .optional(),
});
const statusSchema = baseSchema.extend({
  health: z.number(),
  stamina: z.number(),
  spirit: z.number(),
  hunger: z.number(),
  sleep: z.number(),
  void: z.number(),
  despair: z.number(),
  immune: z.array(z.string()),
  effects: z.array(z.string()),
  character: z.string().optional(),
  expand: z.object({
    character: baseCharacterSchema,
  }),
});

const destinyMaidenSchema = baseSchema.extend({
  name: z.string(),
  image: z.string(),
  description: z.string(),
  characters: z.array(z.string()),
  expand: z.object({
    characters: z.array(baseCharacterSchema),
  }),
});

const beastsSchema = baseSchema.extend({
  name: z.string(),
  image: z.string(),
  description: z.string(),
  health: z.number(),
  stamina: z.number(),
  domesticable: z.boolean(),
  weight: z.number(),
  height: z.number(),
  dangerLevel: z.number(),
  biome: z.string(),
  damageType: z.array(z.string()),
});
const fullCharacterSchema = baseCharacterSchema.extend({
  expand: z.object({
    faction: factionSchema.optional(),
    destinyMaiden: destinyMaidenSchema,
    memories: memorySchema.optional(),
    posts: postSchema,
    player: playerSchema,
    skills: skillsSchema,
    status: statusSchema,
    race: z.array(raceSchema),
    spec: z.array(specSchema),
  }),
});

export {
  baseCharacterSchema,
  characterExpanded,
  createUpdateCharacterSchema,
  factionSchema,
  fullCharacterSchema,
  memorySchema,
  playerSchema,
  postSchema,
  raceSchema,
  skillsSchema,
  specSchema,
  destinyMaidenSchema,
  beastsSchema,
  statusSchema,
  effectSchema,
  inventoryItem,
  itemSchema,
};
