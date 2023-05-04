import { z } from "zod";

import baseSchema from "./baseSchema";

const channelSchema = baseSchema.extend({
  image: z.string(),
  name: z.string(),
  description: z.string(),
  placeholderMessageId: z.string(),
  discordId: z.string(),
  categoryId: z.string(),
  isSafe: z.boolean(),
  hasSpirit: z.boolean(),
  hasSleep: z.boolean(),
});

export default channelSchema;
