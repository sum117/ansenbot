import type { HexColorString } from "discord.js";
import { z } from "zod";

import baseSchema from "./baseSchema";
import { defaultZodString } from "./utiltitySchemas";

const createUpdateCharacterSchema = z.object(
  {
    isNPC: z.boolean().optional(),
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
    specs: z.array(defaultZodString, {
      required_error: "Você deve incluir as classes do personagem.",
    }),
    reputation: z.number({
      required_error: "Você deve incluir a reputação do personagem.",
    }),
    profession: defaultZodString
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
      required_error: "Houve um erro ao criar o status do personagem.",
    }),
    race: z.array(defaultZodString, {
      required_error: "Você deve incluir as raças do personagem.",
    }),
    faction: defaultZodString.optional(),
    memory: defaultZodString.optional(),
    playerId: defaultZodString,
    destinyMaiden: z.string({
      required_error: "Houve um erro ao escolher a Donzela do Destino do personagem.",
    }),
    player: z.string({
      required_error: "Houve um erro ao escolher o jogador do personagem.",
    }),
    posts: z.array(defaultZodString, {
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
    ascendedSkills: z.array(defaultZodString, {
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
  expand: z.object({}).optional(),
});

const itemSchema = baseSchema.extend({
  name: defaultZodString,
  description: defaultZodString,
  type: z.enum(["consumable", "spell", "equipment"]),
});

const consumableTypeSchema = z.enum(["food", "alchemy"]);

const craftingMaterialsSchema = z.object({
  herbs: z.number().default(0),
  vegetables: z.number().default(0),
  meat: z.number().default(0),
  blood: z.number().default(0),
  sugar: z.number().default(0),
  salt: z.number().default(0),
});

const recipeSchema = baseSchema
  .extend({
    item: defaultZodString,
    type: consumableTypeSchema,
    hunger: z.number(),
    health: z.number(),
    mana: z.number(),
    sleep: z.number(),
    stamina: z.number(),
    void: z.number(),
    despair: z.number(),
    cookingLevel: z.number(),
    alchemyLevel: z.number(),
    darknessLevel: z.number(),
    orderLevel: z.number(),
  })
  .extend(craftingMaterialsSchema.shape);

const consumableSchema = baseSchema.extend({
  item: defaultZodString,
  quantity: z.number(),
  hunger: z.number(),
  health: z.number(),
  mana: z.number(),
  sleep: z.number(),
  stamina: z.number(),
  void: z.number(),
  type: consumableTypeSchema,
  expand: z.object(
    {
      item: itemSchema.extend({
        type: z.literal("consumable"),
      }),
    },
    { invalid_type_error: "Não é um item consumível." }
  ),
});

const skillNameSchema = z.enum([
  "darkness",
  "order",
  "charisma",
  "intelligence",
  "discovery",
  "stealth",
  "fortitude",
  "strength",
  "dexterity",
  "vigor",
]);

const statusNameSchema = z.enum([
  "health",
  "stamina",
  "hunger",
  "sleep",
  "void",
  "despair",
  "spirit",
  "mana",
]);

const spellSchema = baseSchema
  .extend({
    rarity: z.string(),
    item: defaultZodString,
    quantity: z.number(),
    isEquipped: z.boolean(),
    isBuff: z.boolean(),
    type: skillNameSchema,
    status: z.array(statusNameSchema),
    manaCost: z.number(),
    healthCost: z.number(),
    staminaCost: z.number(),
    quotient: z.number(),
    multiplier: z.number(),
    slot: z.literal("spells"),
    expand: z.object(
      {
        item: itemSchema.extend({
          type: z.literal("spell"),
        }),
      },
      { invalid_type_error: "Não é um feitiço." }
    ),
  })
  .extend(skillsSchema.omit({ expand: true }).shape);
const equipmentSchema = baseSchema
  .extend({
    rarity: z.string(),
    item: defaultZodString,
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
    type: skillNameSchema,
    isCursed: z.boolean(),
    isWeapon: z.boolean(),
    quotient: z.number(),
    multiplier: z.number(),
    isEquipped: z.boolean(),
    expand: z.object(
      {
        item: itemSchema.extend({
          type: z.literal("equipment"),
        }),
      },
      { invalid_type_error: "Não é um equipamento." }
    ),
  })
  .extend(skillsSchema.omit({ expand: true }).shape);

const inventory = baseSchema.extend({
  consumables: z.array(defaultZodString),
  spells: z.array(defaultZodString),
  equipments: z.array(defaultZodString),
  expand: z.object({
    consumables: z.array(consumableSchema).optional(),
    spells: z.array(spellSchema).optional(),
    equipments: z.array(equipmentSchema).optional(),
  }),
});

const bodySchema = baseSchema.extend({
  head: defaultZodString,
  face: defaultZodString,
  shoulders: defaultZodString,
  amulet: defaultZodString,
  chest: defaultZodString,
  back: defaultZodString,
  legs: defaultZodString,
  feet: defaultZodString,
  leftArm: defaultZodString,
  rightArm: defaultZodString,
  rings: z.array(defaultZodString),
  spells: z.array(defaultZodString),
  character: defaultZodString,
  expand: z
    .object({
      character: baseCharacterSchema,
      head: equipmentSchema.optional(),
      face: equipmentSchema.optional(),
      shoulders: equipmentSchema.optional(),
      amulet: equipmentSchema.optional(),
      chest: equipmentSchema.optional(),
      back: equipmentSchema.optional(),
      legs: equipmentSchema.optional(),
      feet: equipmentSchema.optional(),
      leftArm: equipmentSchema.optional(),
      rightArm: equipmentSchema.optional(),
      rings: z.array(equipmentSchema),
      spells: z.array(spellSchema),
    })
    .optional(),
});

const factionSchema = baseSchema.extend({
  name: defaultZodString,
  image: defaultZodString,
  description: defaultZodString,
});

const memorySchema = baseSchema.extend({
  icon: defaultZodString,
  title: defaultZodString,
  phrase: defaultZodString,
  isActive: z.boolean(),
});
const postSchema = baseSchema.extend({
  content: defaultZodString,
  messageId: defaultZodString,
});

const playerSchema = baseSchema.extend({
  discordId: defaultZodString,
  currentCharacterId: defaultZodString,
  posts: z.array(defaultZodString),
  expand: z
    .object({
      posts: z.array(postSchema),
    })
    .optional(),
});

const raceSchema = baseSchema.extend({
  name: defaultZodString,
  color: defaultZodString.regex(/^#[0-9A-F]{6}$/i) as z.ZodType<HexColorString>,
  image: defaultZodString,
  description: defaultZodString,
});

const effectSchema = baseSchema.extend({
  name: defaultZodString,
  description: defaultZodString,
  type: defaultZodString,
  duration: z.number(),
  amount: z.number(),
});

const specSchema = baseSchema.extend({
  name: defaultZodString,
  description: defaultZodString,
  image: defaultZodString,
});
const statusSchema = baseSchema
  .extend({
    health: z.number(),
    stamina: z.number(),
    spirit: z.number(),
    hunger: z.number(),
    mana: z.number(),
    sleep: z.number(),
    void: z.number(),
    despair: z.number(),
    immune: z.array(defaultZodString),
    effects: z.array(defaultZodString),
  })
  .extend(craftingMaterialsSchema.shape);

const destinyMaidenSchema = baseSchema.extend({
  name: defaultZodString,
  image: defaultZodString,
  description: defaultZodString,
  characters: z.array(defaultZodString),
  expand: z.object({
    characters: z.array(baseCharacterSchema),
  }),
});

const beastsSchema = baseSchema.extend({
  name: defaultZodString,
  image: defaultZodString,
  description: defaultZodString,
  health: z.number(),
  stamina: z.number(),
  domesticable: z.boolean(),
  weight: z.number(),
  height: z.number(),
  dangerLevel: z.number(),
  biome: defaultZodString,
  damageType: z.array(defaultZodString),
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
  beastsSchema,
  bodySchema,
  consumableSchema,
  craftingMaterialsSchema,
  createUpdateCharacterSchema,
  destinyMaidenSchema,
  effectSchema,
  equipmentSchema,
  factionSchema,
  fullCharacterSchema,
  inventory,
  itemSchema,
  memorySchema,
  playerSchema,
  postSchema,
  raceSchema,
  recipeSchema,
  skillsSchema,
  specSchema,
  spellSchema,
  statusSchema,
};
