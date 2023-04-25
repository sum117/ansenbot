import channelSchema from "../schemas/channelSchema";
import { z } from "zod";

export type Channel = z.infer<typeof channelSchema>;
