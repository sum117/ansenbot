import type { StringSelectMenuBuilder } from "discord.js";

export type PromptTypes = "textSelect" | "userSelect";

interface BasePrompt {
  description: string;
  title: string;
}

interface UserSelectPrompt extends BasePrompt {
  type: Exclude<PromptTypes, "textSelect">;
}

interface TextSelectPrompt extends BasePrompt {
  fields: StringSelectMenuBuilder[];
  type: "textSelect";
}

export type Prompt = TextSelectPrompt | UserSelectPrompt;
