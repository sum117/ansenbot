import { z } from "zod";

import type { COLLECTIONS } from "../data/constants";
import baseSchema from "./baseSchema";
import { defaultZodString } from "./utiltitySchemas";

const formSchema = baseSchema.extend({
  description: defaultZodString,
  image: defaultZodString,
  collection: defaultZodString as z.ZodType<keyof typeof COLLECTIONS>,
  step: z.number(),
  title: defaultZodString,
  isSelectMenu: z.boolean(),
});

export default formSchema;
