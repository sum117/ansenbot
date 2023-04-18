import { z } from "zod";

import type { COLLECTIONS } from "../data/constants";
import baseSchema from "./baseSchema";

const formSchema = baseSchema.extend({
  description: z.string(),
  image: z.string(),
  collection: z.string() as z.ZodType<keyof typeof COLLECTIONS>,
  step: z.number(),
  title: z.string(),
  isSelectMenu: z.boolean(),
});

export default formSchema;
