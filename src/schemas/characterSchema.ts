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
    specs: z.array(z.string(), {
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
    posts: z.array(z.string(), {
      required_error: "Houve um erro ao criar os posts do personagem.",
    }),
    inventory: z.string({
      required_error: "Houve um erro ao criar o inventário do personagem.",
    }),
    xp: z.number({
      required_error: "Houve um erro ao criar a experiência do personagem.",
    }),
    skillPoints: z.number({
      required_error: "Houve um erro ao criar os pontos de habilidade do personagem.",
    }),
    ascendedSkills: z.array(z.string(), {
      required_error: "Houve um erro ao criar as habilidades ascendentes do personagem.",
    }),
    skillTraits: z.array(
      z.string({
        required_error: "Houve um erro ao criar os traços de habilidade do personagem.",
      })
    ),
    body: z.string({
      required_error: "Houve um erro ao criar o corpo do personagem.",
    }),
  },
  {
    description: "Schema para criação e atualização de personagens.",
    required_error: "Você deve incluir todos os campos obrigatórios.",
  }
);

const baseCharacterSchema = baseSchema.extend({
  ...createUpdateCharacterSchema.shape,
});

const itemSchema = baseSchema.extend({
  name: z.string(),
  description: z.string(),
  type: z.enum(["consumable", "spell", "equipment"]),
});

const consumableSchema = baseSchema.extend({
  item: z.string(),
  quantity: z.number(),
  hunger: z.number(),
  health: z.number(),
  stamina: z.number(),
  void: z.number(),
  isCooked: z.boolean(),
  isPoisoned: z.boolean(),
  expand: z.object(
    {
      item: itemSchema.extend({
        type: z.literal("consumable"),
      }),
    },
    { invalid_type_error: "Não é um item consumível." }
  ),
});
const spellSchema = baseSchema.extend({
  item: z.string(),
  quantity: z.number(),
  isEquipped: z.boolean(),
  slot: z.literal("spells"),
  expand: z.object(
    {
      item: itemSchema.extend({
        type: z.literal("spell"),
      }),
    },
    { invalid_type_error: "Não é um feitiço." }
  ),
});
const equipmentSchema = baseSchema.extend({
  item: z.string(),
  quantity: z.number(),
  slot: z.enum([
    "head",
    "face",
    "shoulders",
    "chest",
    "amulet",
    "back",
    "legs",
    "feet",
    "leftArm",
    "rightArm",
    "rings",
    "spells",
  ]),
  isEquipped: z.boolean(),
  expand: z.object(
    {
      item: itemSchema.extend({
        type: z.literal("equipment"),
      }),
    },
    { invalid_type_error: "Não é um equipamento." }
  ),
});

const inventory = baseSchema.extend({
  consumables: z.array(z.string()),
  spells: z.array(z.string()),
  equipments: z.array(z.string()),
  expand: z.object({
    consumables: z.array(consumableSchema).optional(),
    spells: z.array(spellSchema).optional(),
    equipments: z.array(equipmentSchema).optional(),
  }),
});

const bodySchema = baseSchema.extend({
  head: z.string(),
  face: z.string(),
  shoulders: z.string(),
  amulet: z.string(),
  chest: z.string(),
  back: z.string(),
  legs: z.string(),
  feet: z.string(),
  leftArm: z.string(),
  rightArm: z.string(),
  rings: z.array(z.string()),
  spells: z.array(z.string()),
  character: z.string(),
  expand: z
    .object({
      character: baseCharacterSchema,
      head: equipmentSchema,
      face: equipmentSchema,
      shoulders: equipmentSchema,
      amulet: equipmentSchema,
      chest: equipmentSchema,
      back: equipmentSchema,
      legs: equipmentSchema,
      feet: equipmentSchema,
      leftArm: equipmentSchema,
      rightArm: equipmentSchema,
      rings: z.array(equipmentSchema),
      spells: z.array(spellSchema),
    })
    .optional(),
});

const factionSchema = baseSchema.extend({
  name: z.string(),
  image: z.string(),
  description: z.string(),
});

const memorySchema = baseSchema.extend({
  icon: z.string(),
  title: z.string(),
  phrase: z.string(),
  isActive: z.boolean(),
});
const postSchema = baseSchema.extend({
  content: z.string(),
  messageId: z.string(),
});

const playerSchema = baseSchema.extend({
  discordId: z.string(),
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
  image: z.string(),
  description: z.string(),
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
});

const specSchema = baseSchema.extend({
  name: z.string(),
  description: z.string(),
  image: z.string(),
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
    specs: z.array(specSchema),
    body: bodySchema,
    inventory: inventory,
  }),
});

export {
  baseCharacterSchema,
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
  inventory,
  consumableSchema,
  spellSchema,
  equipmentSchema,
  itemSchema,
  bodySchema,
};
