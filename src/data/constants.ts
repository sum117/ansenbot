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
  item: "item",
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
  ].join(","),
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
  hunger: "fortitude",
  void: "darkness",
  stamina: "strength",
  despair: "darkness",
} as const;

export const STATUS_GAIN_PER_LEVEL = 10 as const;
