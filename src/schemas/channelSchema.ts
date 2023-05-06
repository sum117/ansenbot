import { z } from "zod";

import baseSchema from "./baseSchema";
import { defaultZodString } from "./utiltitySchemas";

const channelSchema = baseSchema.extend({
  image: defaultZodString,
  name: defaultZodString,
  description: defaultZodString,
  placeholderMessageId: defaultZodString,
  discordId: defaultZodString,
  categoryId: defaultZodString,
  isSafe: z.boolean(),
  hasSpirit: z.boolean(),
  hasSleep: z.boolean(),
});

export default channelSchema;
