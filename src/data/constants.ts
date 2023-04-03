export const COLLECTIONS = {
  characters: "characters",
  factions: "factions",
  races: "races",
  skills: "skills",
  status: "status",
} as const;

export const RELATION_FIELD_NAMES = {
  factions: "faction",
  races: "race",
  skills: "skills",
  status: "status",
} as const;

export const MAX_FILE_SIZE = 15_000_000;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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
