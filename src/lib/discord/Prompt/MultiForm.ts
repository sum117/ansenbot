import assert from "assert";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import split from "just-split";

import type { Prompt } from "../../../types/MultiForm";
import { BotError } from "../../../utils/Errors";
import { BaseMessageBuilder } from "../Builders/BaseMessageBuilder";

export default class MultiForm extends BaseMessageBuilder {
  constructor(public readonly prompt: Prompt) {
    super();
    this.setEmbeds([
      new EmbedBuilder()
        .setTitle(this.prompt.title)
        .setDescription(this.prompt.description)
        .setImage(this.prompt.imageUrl ?? null)
        .setColor(this.prompt.embedColor ?? "Random"),
    ]);
    this.sortComponents();
  }

  public getEmbedDescription(): string {
    const embed = this.embeds?.[0];
    assert(embed, new BotError("No embed found"));
    return EmbedBuilder.from(embed).data.description ?? "";
  }

  public setEmbedDescription(description: string): this {
    const embed = this.embeds?.[0];
    assert(embed, new BotError("No embed found"));
    this.embeds = [EmbedBuilder.from(embed).setDescription(description)];
    return this;
  }

  public setMessageContent(content: string): this {
    this.setContent(content);
    return this;
  }

  private sortComponents() {
    const { fields } = this.prompt;

    const buttons = fields.filter(
      (field): field is ButtonBuilder => field instanceof ButtonBuilder
    );
    const selectMenus = fields.filter(
      (field): field is StringSelectMenuBuilder | UserSelectMenuBuilder =>
        field instanceof StringSelectMenuBuilder || field instanceof UserSelectMenuBuilder
    );

    const buttonRows = split(buttons, 5).map((row) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(...row);
    });

    const selectMenuRows = split(selectMenus, 5).map((row) => {
      return new ActionRowBuilder<StringSelectMenuBuilder | UserSelectMenuBuilder>().addComponents(
        ...row
      );
    });

    this.setComponents([...buttonRows, ...selectMenuRows]);
  }
}
