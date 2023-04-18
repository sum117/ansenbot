import type {
  ButtonBuilder,
  ColorResolvable,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import type z from "zod";

import type formSchema from "../schemas/formSchema";

export interface Prompt {
  description: string;
  embedColor?: ColorResolvable;
  fields: (StringSelectMenuBuilder | UserSelectMenuBuilder | ButtonBuilder)[];
  imageUrl?: string;
  title: string;
}

export type Form = z.infer<typeof formSchema>;

export interface PromptWithController extends Prompt {
  /**
   * If true, the last row of buttons will contain a "continue", "cancel" and "back" button.
   */
  controller: true;
  /**
   * Can only have a maximum of 5 buttons.
   */
  controlFields: ButtonBuilder[];
}
