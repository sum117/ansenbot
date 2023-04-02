import { z } from "zod";

import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "../data/constants";

export const defaultZodString = z.string().trim();
export const defaultZodImage = z
  .any()
  .refine((file) => file?.size <= MAX_FILE_SIZE, "Max image size is 5MB.")
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported."
  );
