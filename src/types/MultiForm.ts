import type {
  ButtonBuilder,
  ColorResolvable,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";

export interface Prompt {
  description: string;
  embedColor?: ColorResolvable;
  fields: (StringSelectMenuBuilder | UserSelectMenuBuilder | ButtonBuilder)[];
  imageUrl?: string;
  title: string;
}
