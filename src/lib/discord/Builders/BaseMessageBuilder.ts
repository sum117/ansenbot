import type {
  BaseMessageOptions,
  EmbedBuilder,
  MessageMentionOptions,
} from "discord.js";

export class BaseMessageBuilder implements BaseMessageOptions {
  public files: BaseMessageOptions["files"] | undefined;
  public allowedMentions?: MessageMentionOptions | undefined;
  public components?: BaseMessageOptions["components"] | undefined;
  public content?: string | undefined;
  public embeds?: BaseMessageOptions["embeds"] | undefined;

  public constructor(data?: BaseMessageOptions) {
    this.files = data?.files;
    this.allowedMentions = data?.allowedMentions;
    this.components = data?.components;
    this.content = data?.content;
    this.embeds = data?.embeds;
  }

  setContent(content: string): this {
    this.content = content;
    return this;
  }
  setEmbeds(embeds: EmbedBuilder[]): this {
    this.embeds = embeds;
    return this;
  }

  setFiles(files: BaseMessageOptions["files"]): this {
    this.files = files;
    return this;
  }

  setAllowedMentions(allowedMentions: MessageMentionOptions): this {
    this.allowedMentions = allowedMentions;
    return this;
  }
  setComponents(components: BaseMessageOptions["components"]): this {
    this.components = components;
    return this;
  }
}
