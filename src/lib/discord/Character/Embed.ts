import type { BaseMessageOptions } from "discord.js";
import {
  AttachmentBuilder,
  Collection,
  Colors,
  EmbedBuilder,
  userMention,
} from "discord.js";

import type { CharacterData } from "../../../types";
import { PocketBase } from "../../pocketbase";

export class CharacterPost {
  constructor(private character: CharacterData) {
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
    embed.setColor(Colors.Blurple);

    const fields = new Collection<string, string>();
    fields.set("Dono", userMention(this.character.userId));
    fields.set("Gênero", this.formatCharacterGender(this.character));
    fields.set("Idade", this.character.age.toString());
    fields.set("Nível", this.character.level.toString());
    fields.set("Raça", this.character.race);
    fields.set("Classe", this.character.spec);
    fields.set("Facção", this.character.faction);
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
  }: CharacterData): string | null {
    const hasBackstory = Boolean(backstory);
    const hasPersonality = Boolean(personality);
    const description =
      (hasBackstory ? `**História:** ${backstory}` : "") +
      (hasBackstory && hasPersonality ? "\n\n" : "") +
      (hasPersonality ? `**Personalidade:** ${personality}` : "");

    return description ? description : null;
  }

  private formatCharacterGender({ gender }: CharacterData) {
    return gender === "male" ? "Masculino" : "Feminino";
  }
}
