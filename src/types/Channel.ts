import type { z } from "zod";

import type channelSchema from "../schemas/channelSchema";

export type Channel = z.infer<typeof channelSchema>;
