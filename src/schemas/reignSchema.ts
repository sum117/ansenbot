import { z } from "zod";

import baseSchema from "./baseSchema";
import { defaultZodString } from "./utiltitySchemas";

const reignSchema = baseSchema.extend({
  name: defaultZodString,
  categoryId: defaultZodString,
  image: defaultZodString,
  owner: defaultZodString,
  characters: z.array(defaultZodString),
  channels: z.array(defaultZodString),
});

export default reignSchema;
