export const COLLECTIONS = {
  characters: "characters",
  posts: "posts",
  factions: "factions",
  races: "races",
  skills: "skills",
  status: "status",
  players: "players",
  memories: "memories",
} as const;
export const RELATION_FIELD_NAMES = {
  character: "character",
  factions: "faction",
  race: "race",
  skills: "skills",
  status: "status",
  player: "player",
  characters: "characters",
  memory: "memory",
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
