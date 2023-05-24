import type { StatusBar } from "../types/Character";

export const SPINNER_EMOJI = "<a:spinner:1094479348037324820>";

export const COLLECTIONS = {
  characters: "characters",
  posts: "posts",
  factions: "factions",
  races: "races",
  skills: "skills",
  status: "status",
  players: "players",
  memories: "memories",
  specs: "specs",
  startingSkills: "startingSkills",
  destinyMaidens: "destinyMaidens",
  beasts: "beasts",
  inventory: "inventory",
  consumables: "consumables",
  equipments: "equipments",
  spells: "spells",
  items: "items",
  forms: "forms",
  effects: "effects",
  channels: "channels",
  body: "body",
} as const;
export const RELATION_FIELD_NAMES = {
  factions: "faction",
  races: "race",
  skills: "skills",
  status: "status",
  effects: "effects",
  player: "player",
  memory: "memory",
  specs: "specs",
  destinyMaiden: "destinyMaiden",
  startingSkills: "startingSkills",
  inventory: [
    "inventory.consumables.item",
    "inventory.spells.item",
    "inventory.equipments.item",
  ].join(","),
  item: ["item", "consumables(item)", "equipments(item)", "spells(item)"].join(","),
  body: [
    "body.head.item",
    "body.face.item",
    "body.shoulders.item",
    "body.chest.item",
    "body.amulet.item",
    "body.back.item",
    "body.legs.item",
    "body.feet.item",
    "body.leftArm.item",
    "body.rightArm.item",
    "body.rings.item",
    "body.spells.item",
  ].join(","),
  head: "head.item",
  face: "face.item",
  shoulders: "shoulders.item",
  chest: "chest.item",
  amulet: "amulet.item",
  back: "back.item",
  legs: "legs.item",
  feet: "feet.item",
  leftArm: "leftArm.item",
  rightArm: "rightArm.item",
  rings: "rings.item",
  spells: "spells.item",
} as const;
export const MAX_FILE_SIZE = 15_000_000;
export const ACCEPTED_IMAGE_TYPES = ["jpeg", "jpg", "png", "webp"];
export const JOIN_FORM_VALUES = {
  adult: "adult",
  female: "female",
  kid: "kid",
  line: "line",
  male: "male",
  noMentor: "false",
  other: "other",
  page: "page",
  paragraph: "paragraph",
  teen: "teen",
  wantsMentor: "true",
} as const;

export const ITEM_TYPES = {
  consumable: "consumable",
  equipment: "equipment",
  spell: "spell",
} as const;

export const STATUS_SKILLS_RELATION = {
  health: "vigor",
  sleep: "fortitude",
  mana: "intelligence",
  hunger: "fortitude",
  void: "darkness",
  stamina: "fortitude",
  despair: "darkness",
} as const;

export const STATUS_NAMES = {
  health: "Saúde",
  sleep: "Sono",
  hunger: "Fome",
  void: "Vazio",
  stamina: "Energia",
  despair: "Desespero",
} as const;

export const ITEM_TYPES_EMOJIS = {
  consumable: "<:consumableemoji:1110956925660692632>",
  equipment: "<:equipmentemoji:1110953970832244886>",
  spell: "<:spellemoji:1110953972941979799>",
} as const;

export const STATUS_BAR_DETAILS: Record<keyof typeof STATUS_SKILLS_RELATION, StatusBar> = {
  health: {
    emoji: "<:he:1107400309443145818>",
    color: "<:hb:1107400290065457234>",
  },
  stamina: {
    emoji: "<:se:1107400307564097627>",
    color: "<:sb:1107400275473477692>",
  },
  mana: { emoji: "<:me:1110952945295573002>", color: "🟦" },
  void: { emoji: "<:ve:1107402190001274901>", color: "<:vb:1107400279202222140>" },
  hunger: {
    emoji: "<:he:1107400300144378009>",
    color: "<:hb:1107400284659007538>",
  },
  sleep: { emoji: "<:sle:1107400296205930578>", color: "<:sb:1107400281064485006>" },
  despair: {
    emoji: "<:de:1107400304078639165>",
    color: "<:db:1107400287783747667>",
  },
};
export const EMPTY_BAR_EMOJI = "<:eb:1107400620580802702>";
export const SKILLS_EMOJIS = {
  charisma: "😊",
  darkness: "🌑",
  dexterity: "🤸",
  discovery: "🔎",
  fortitude: "🏋️",
  intelligence: "🧠",
  order: "🧘‍♂️",
  stealth: "👻",
  strength: "💪",
  vigor: "🏃‍♂️",
} as const;
export const ITEM_ACTIONS = {
  equipment: "Equipar",
  spell: "Memorizar Feitiço",
  consumable: "Usar",
} as const;
export const ITEM_ACTIONS_CUSTOM_IDS = {
  equipment: "equip",
  spell: "equip",
  consumable: "use",
} as const;
export const PAGE_SIZE = 5;
export const STATUS_GAIN_PER_LEVEL = 10 as const;

export const MANA_COST_MULTIPLIER = 2;
export const STAMINA_COST_MULTIPLIER = 1.3;

export const QUOTIENT_RANGES = {
  n: [10, 45],
  r: [55, 70],
  sr: [75, 115],
  ssr: [120, 150],
} as const;

export const MULTIPLIER_RANGES = {
  n: [1, 2],
  r: [4, 6],
  sr: [7, 9],
  ssr: [10, 12],
} as const;

export const REQUIREMENT_RANGES = {
  n: [0, 15],
  r: [16, 25],
  sr: [26, 60],
  ssr: [61, 99],
} as const;

export const STATUS_GIVEN_PER_RARITY_RANGE = {
  n: [1, 2],
  r: [2, 3],
  sr: [3, 4],
  ssr: [4, 6],
};
export const SPIRIT_GAIN_PER_TICK = 125;
export const ENDURANCE_GAIN_PER_SAFE_TICK_MULTIPLIER = 2;

export const RARITY_IMAGES = {
  n: "https://i.imgur.com/OEqauf9.png",
  r: "https://i.imgur.com/d4X0vu2.png",
  sr: "https://i.imgur.com/svrCQNX.png",
  ssr: "https://i.imgur.com/f4Hftkz.png",
};
export const GACHA_MODAL_ID_REGEX = /^gacha:item:modal(:(?<param>\w+))?$/;
export const GACHA_ID_PREFIX = "gacha:item";
export const GACHA_ID_REGEX = /gacha:item:(?<param>\w+)/;
export const CHARACTER_INTERACTION_ID_REGEX =
  /character:interaction:(?<action>\w+):(?<agentId>(\d+|null)):(?<targetId>\d+)/;
export const BATTLE_INTERACTION_ID_REGEX =
  /battle:(?<action>\w+):(?<kind>\w+):(?<agentId>\d+):(?<targetId>\d+)/;

export const INVENTORY_REGEX =
  /character:(inventory|item):(browse|use|discard|open|equip|info):(\w+):\d+(:\d+:(previous|next|null))?/;

export const CHARACTER_LEVELING_REGEX =
  /^character:leveling:(?<playerId>\d+):((?<skillId>\w+):)?(?<action>previous|next|level-one-time|level-ten-times|open)$/;
