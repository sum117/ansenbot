import {
  ActionRowBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  ColorResolvable,
  EmbedBuilder,
  userMention,
} from "discord.js";

import { skillsDictionary } from "../../../../data/translations";
import type { Character } from "../../../../types/Character";
import { BotError } from "../../../../utils/Errors";
import getSafeEntries from "../../../../utils/getSafeEntries";
import PocketBase from "../../../pocketbase/PocketBase";

export default class CharacterPost {
  public embed: EmbedBuilder = new EmbedBuilder();

  constructor(private character: Character) {
    this.embed.setTitle(`${this.character.name} ${this.character.surname}`);
    this.embed.setDescription(this.formatCharacterDescription(this.character));
    this.embed.setAuthor(this.character.title ? { name: this.character.title } : null);
    this.embed.setColor((this.character.expand.race[0].color as ColorResolvable) ?? null);
  }

  public createMessageOptions({
    to,
    embedContent,
    attachmentUrl,
  }: {
    attachmentUrl?: string;
    embedContent?: string;
    to: "message" | "profile";
  }): BaseMessageOptions {
    const options: BaseMessageOptions = {};
    let embed: EmbedBuilder = new EmbedBuilder();

    if (to === "profile") {
      if (embedContent) {
        throw new BotError("You can't provide content to a profile!");
      }
      embed = this.getProfileEmbed();
    } else {
      if (!embedContent) {
        throw new BotError("You must provide content to post!");
      }
      embed = this.getPostEmbed({ attachmentUrl, content: embedContent });
    }

    const image = PocketBase.getImageUrl({
      fileName: this.character.image,
      record: this.character,
      thumb: true,
    });
    embed.setThumbnail(image);

    options.components = [
      new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder()
          .setCustomId(`character:status:${this.character.id}:${this.character.playerId}`)
          .setLabel("Status")
          .setEmoji("📊")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`character:inventory:${this.character.id}:${this.character.playerId}`)
          .setLabel("Inventário")
          .setEmoji("🎒")
          .setStyle(ButtonStyle.Primary),
      ]),
    ];

    options.embeds = [embed];
    return options;
  }

  private getPostEmbed<T extends { attachmentUrl: string | undefined; content: string }>({
    content,
    attachmentUrl,
  }: T): EmbedBuilder {
    this.embed.setDescription(content ?? null);
    this.embed.setImage(attachmentUrl ?? null);
    this.embed.setTimestamp(Date.now());
    return this.embed;
  }

  private getProfileEmbed(): EmbedBuilder {
    if (!this.character.expand) {
      throw new BotError("Character must have expand data to create a profile!");
    }
    const fields = new Collection<string, string>();
    fields.set("Dono", userMention(this.character.playerId));
    fields.set("Gênero", this.formatCharacterGender(this.character));
    fields.set("Idade", this.character.age.toString());
    fields.set("Nível", this.character.level.toString());
    fields.set("Raça", this.character.expand.race.map((race) => race.name).join(" & "));
    fields.set("Classe", this.character.expand.spec.map((spec) => spec.name).join(" & "));
    fields.set("Dama do Destino", this.character.expand.destinyMaiden.name);

    if (this.character.expand.faction) {
      fields.set("Facção", this.character.expand.faction.name);
    }
    if (this.character.profession) {
      fields.set("Profissão", this.character.profession);
    }

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

  private formatCharacterSkills({ expand }: Character) {
    if (!expand) {
      throw new BotError("Character must have expand data to create a profile!");
    }
    const { skills } = expand;
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

  private formatCharacterDescription({ backstory, personality }: Character): string | null {
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
