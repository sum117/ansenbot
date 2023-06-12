import type { z } from "zod";

import type reignSchema from "../schemas/reignSchema";

export type Reign = z.infer<typeof reignSchema>;
