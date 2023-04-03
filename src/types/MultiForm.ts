import type { ColorResolvable, StringSelectMenuBuilder, UserSelectMenuBuilder } from "discord.js";

export interface Prompt {
  description: string;
  embedColor?: ColorResolvable;
  fields: (StringSelectMenuBuilder | UserSelectMenuBuilder)[];
  imageUrl?: string;
  title: string;
}
