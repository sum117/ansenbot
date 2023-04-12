import { z } from "zod";

import type { Character } from "../types/Character";
import type { CreateData } from "../types/PocketBaseCRUD";
import { defaultZodImage, defaultZodString } from "./utiltitySchemas";

const characterSchema: z.Schema<
  CreateData<Omit<Character, "expand" | "skills" | "status" | "image">>
> = z.object({
  age: z.number().int().min(18, "age must be at least 18"),
  appearance: defaultZodString
    .min(128, "appearance must be at least 128 characters")
    .max(512, "appearance must be at most 512 characters"),
  backstory: defaultZodString
    .min(128, "backstory must be at least 128 characters")
    .max(2096, "backstory must be at most 2096 characters"),
  faction: defaultZodString,
  gender: z.enum(["male", "female"]),
  image: defaultZodImage,
  level: z.number().int().max(0, "This field must be exactly 0"),
  name: defaultZodString
    .min(3, "name must be at least 3 characters")
    .max(64, "name must be at most 64 characters"),
  personality: defaultZodString
    .min(128, "The personality must be at least 128 characters")
    .max(1024, "The personality must be at most 1024 characters"),
  profession: defaultZodString.max(128, "The profession must be at most 128 characters"),
  memory: defaultZodString,
  race: defaultZodString,
  spec: defaultZodString,
  surname: defaultZodString
    .min(3, "The surname must be at least 3 characters")
    .max(64, "The surname must be at most 64 characters"),
  title: defaultZodString
    .min(3, "title must be at least 3 characters")
    .max(128, "title must be at most 128 characters"),
  playerId: defaultZodString.min(17, "userId must be at least 17 characters"),
});

export default characterSchema;
