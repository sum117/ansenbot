import type { BaseMessageOptions } from "discord.js";
import {
  AttachmentBuilder,
  Collection,
  EmbedBuilder,
  userMention,
} from "discord.js";

import { skillsDictionary } from "../../../../data/translations";
import type { Character } from "../../../../types/Character";
import getSafeEntries from "../../../../utils/getSafeEntries";
import PocketBase from "../../../pocketbase/classes/PocketBase";

export default class CharacterPostEmbed {
  public embed: EmbedBuilder = new EmbedBuilder();
  constructor(private character: Character) {
    this.character = character;
    this.embed.setTitle(`${this.character.name} ${this.character.surname}`);
    this.embed.setDescription(this.formatCharacterDescription(this.character));
    this.embed.setAuthor(
      this.character.title ? { name: this.character.title } : null
    );
    this.embed.setColor(this.character.expand.race.color);
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

  private getPostEmbed<T extends { attachmentUrl: string; content: string }>({
    content,
    attachmentUrl,
  }: T): EmbedBuilder {
    this.embed.setDescription(content ?? null);
    this.embed.setImage(attachmentUrl ?? null);
    this.embed.setTimestamp(Date.now());
    return this.embed;
  }
  private getProfileEmbed(): EmbedBuilder {
    const fields = new Collection<string, string>();
    fields.set("Dono", userMention(this.character.userId));
    fields.set("Gênero", this.formatCharacterGender(this.character));
    fields.set("Idade", this.character.age.toString());
    fields.set("Nível", this.character.level.toString());
    fields.set("Raça", this.character.expand.race.name);
    fields.set("Classe", this.character.spec);
    fields.set("Facção", this.character.expand.faction.name);
    fields.set("Skills", this.formatCharacterSkills(this.character));

    this.embed.addFields(
      fields
        .filter((value) => Boolean(value))
        .map((value, key) => ({
          inline: key !== "Skills",
          name: key,
          value,
        }))
    );
    return this.embed;
  }

  private formatCharacterSkills({ expand: { skills } }: Character) {
    const {
      collectionId: _collectionId,
      collectionName: _collectionName,
      id: _id,
      character: _character,
      created: _created,
      updated: _updated,
      expand: _expand,
      ...rest
    } = skills;

    const skillRows = getSafeEntries(rest).map(([skillName, skillLevel]) => {
      const skill = skillsDictionary[skillName];
      return `${skill}: ${skillLevel}`;
    });

    return skillRows.join("\n");
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
