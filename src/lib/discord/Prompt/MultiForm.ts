import type {
  Message,
  StringSelectMenuBuilder,
  TextBasedChannel,
  UserSelectMenuBuilder,
} from "discord.js";
import { ActionRowBuilder, EmbedBuilder } from "discord.js";

import type { Prompt } from "../../../types/MultiForm";
import { BaseMessageBuilder } from "../Builders/BaseMessageBuilder";

export default class MultiForm {
  protected promptMessage = new BaseMessageBuilder();
  constructor(public readonly prompt: Prompt) {
    this.promptMessage.setEmbeds([
      new EmbedBuilder()
        .setTitle(this.prompt.title)
        .setDescription(this.prompt.description)
        .setImage(this.prompt.imageUrl ?? null)
        .setColor(this.prompt.embedColor ?? "Random"),
    ]);

    if (this.prompt.fields.length > 5) {
      throw new Error(
        "You can only have 5 Select Menus in a Message (Discord limits for Action Rows)"
      );
    }
    const { fields } = this.prompt;

    this.promptMessage.setComponents([
      ...fields.map((field) =>
        new ActionRowBuilder<StringSelectMenuBuilder | UserSelectMenuBuilder>().addComponents(field)
      ),
    ]);
  }
  public setMessageContent(content: string): this {
    this.promptMessage.setContent(content);
    return this;
  }
  public sendPrompt(channel: TextBasedChannel): Promise<Message> {
    return channel.send(this.promptMessage);
  }
}
