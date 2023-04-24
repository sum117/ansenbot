export const COLLECTIONS = {
  characters: "characters",
  posts: "posts",
  factions: "factions",
  races: "races",
  skills: "skills",
  status: "status",
  players: "players",
  memories: "memories",
  spec: "spec",
  startingSkills: "startingSkills",
  destinyMaidens: "destinyMaidens",
  beasts: "beasts",
  inventory: "inventory",
  items: "items",
  forms: "forms",
  effects: "effects",
} as const;
export const RELATION_FIELD_NAMES = {
  character: "character",
  factions: "faction",
  race: "race",
  skills: "skills",
  status: "status",
  effects: "effects",
  player: "player",
  characters: "characters",
  memory: "memory",
  spec: "spec",
  destinyMaiden: "destinyMaiden",
  startingSkills: "startingSkills",
  inventory: "inventory",
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
  armor: "armor",
  weapon: "weapon",
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
