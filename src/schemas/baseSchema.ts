import { z } from "zod";

import { defaultZodString } from "./utiltitySchemas";

const baseSchema = z.object({
  id: defaultZodString,
  collectionId: defaultZodString,
  collectionName: defaultZodString,
  created: defaultZodString,
  updated: defaultZodString,
});
export default baseSchema;
