import assert from "assert";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import split from "just-split";

import type { Prompt } from "../../../../types/MultiForm";
import { BotError } from "../../../../utils/Errors";
import { BaseMessageBuilder } from "../../Builders/BaseMessageBuilder";

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

  private get embed(): EmbedBuilder {
    return EmbedBuilder.from(this.embeds?.[0] ?? new EmbedBuilder());
  }

  private set embed(embed: EmbedBuilder) {
    this.setEmbeds([embed]);
  }

  public addEmbedFields(
    fields: Array<{ name: string; value: string; inline?: boolean }>
  ): MultiForm {
    this.embed = this.embed.addFields(fields);
    return this;
  }

  public getEmbedDescription(): string {
    const embed = this.embeds?.[0];
    assert(embed, new BotError("No embed found"));
    return EmbedBuilder.from(embed).data.description ?? "";
  }

  public setEmbedDescription(description: string): this {
    this.embed = this.embed.setDescription(description);
    return this;
  }

  public setEmbedImage(url: string): this {
    this.embed = this.embed.setImage(url);
    return this;
  }

  public setEmbedTitle(title: string): this {
    this.embed = this.embed.setTitle(title);
    return this;
  }

  public setMessageContent(content: string): this {
    this.setContent(content);
    return this;
  }

  private getControlledFields(): ActionRowBuilder<ButtonBuilder> | undefined {
    if (this.prompt.controller) {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(this.prompt.controlFields);
    }
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

    const selectMenuRows = selectMenus.map((row) => {
      return new ActionRowBuilder<StringSelectMenuBuilder | UserSelectMenuBuilder>().addComponents(
        row
      );
    });
    const controlledFields = this.getControlledFields();
    this.setComponents([...buttonRows, ...selectMenuRows]);
    if (controlledFields) {
      this.addComponents([controlledFields]);
    }
  }
}
