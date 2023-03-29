import type { BaseMessageOptions } from "discord.js";
import {
  AttachmentBuilder,
  Collection,
  EmbedBuilder,
  userMention,
} from "discord.js";

import type { Character } from "../../../types";
import { PocketBase } from "../../pocketbase/PocketBase";

export class CharacterPost {
  constructor(private character: Character) {
    this.character = character;
  }

  public async createMessageOptions({
    to,
  }: {
    to: "profile" | "message";
  }): Promise<BaseMessageOptions> {
    const options: BaseMessageOptions = {};
    let embed: EmbedBuilder = new EmbedBuilder();
    if (to === "profile") {
      embed = this.getProfileEmbed();
    }
    const image = await PocketBase.getImageUrl({
      fileName: this.character.image,
      record: this.character,
      thumb: true,
    });

    if (typeof image === "string") {
      embed.setThumbnail(image);
    } else {
      const attachment = new AttachmentBuilder(image);
      attachment.setName(this.character.image);
      options.files = [attachment];
      embed.setImage("attachment://" + this.character.image);
    }

    options.embeds = [embed];
    return options;
  }

  private getProfileEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder();
    embed.setTitle(`${this.character.name} ${this.character.surname}`);
    embed.setDescription(this.formatCharacterDescription(this.character));
    embed.setAuthor(
      this.character.title ? { name: this.character.title } : null
    );
    embed.setColor(this.character.expand.race.color);

    const fields = new Collection<string, string>();
    fields.set("Dono", userMention(this.character.userId));
    fields.set("Gênero", this.formatCharacterGender(this.character));
    fields.set("Idade", this.character.age.toString());
    fields.set("Nível", this.character.level.toString());
    fields.set("Raça", this.character.expand.race.name);
    fields.set("Classe", this.character.spec);
    fields.set("Facção", this.character.expand.faction.name);
    embed.addFields(
      fields
        .filter((value) => Boolean(value))
        .map((value, key) => ({ inline: true, name: key, value }))
    );

    return embed;
  }

  private formatCharacterDescription({
    backstory,
    personality,
  }: Character): string | null {
    const parts = [];
    if (backstory) {
      parts.push(`**História:** ${backstory}`);
    }
    if (personality) {
      parts.push(`**Personalidade:** ${personality}`);
    }

    return parts.length ? parts.join("\n\n") : null;
  }

  private formatCharacterGender({ gender }: Character) {
    return gender === "male" ? "Masculino" : "Feminino";
  }
}
