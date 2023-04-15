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

export const isImageUrl = z
  .string()
  .url()
  .refine((url) => {
    const ext = url.split(".")?.pop();
    if (!ext) {
      return false;
    }
    return ACCEPTED_IMAGE_TYPES.includes(ext);
  }, "Only .jpg, .jpeg, .png and .webp formats are supported.");
