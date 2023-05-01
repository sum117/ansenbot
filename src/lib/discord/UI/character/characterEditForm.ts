import type { ChatInputCommandInteraction, ModalSubmitInteraction } from "discord.js";
import {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import mustache from "mustache";

import type { Faction } from "../../../../types/Character";
import { BotError } from "../../../../utils/Errors";
import replyOrFollowUp from "../../../../utils/replyOrFollowUp";
import CharacterFetcher from "../../../pocketbase/CharacterFetcher";
import PocketBase from "../../../pocketbase/PocketBase";
import MultiForm from "../classes/MultiForm";

const characterEditForm = async (
  interaction: ChatInputCommandInteraction | ModalSubmitInteraction
): Promise<MultiForm | void> => {
  let charId: string | null;
  if (interaction.isCommand()) {
    charId = interaction.options.getString("personagem");
  } else {
    charId = interaction.customId.split(":")[2];
  }

  if (!interaction.inCachedGuild() || !charId) {
    throw new BotError("Cannot manage user with invalid interaction");
  }

  const character = await CharacterFetcher.getCharacterById(charId);

  if (!CharacterFetcher.isOwner(interaction.user.id, character.playerId)) {
    void replyOrFollowUp(interaction, {
      content: "Você não é o dono desse personagem.",
    });
    return;
  }

  const allFactions = await PocketBase.getAllEntities<Faction>({
    page: 1,
    entityType: "factions",
  });
  const view = {
    user: interaction.user.username,
    characterName: `${character.name} ${character.surname}`,
  };
  const makeCustomId = (action: string) => `editChar:${action}:${character.id}`;
  return new MultiForm({
    description: mustache.render(
      "Olá {{{user}}}, você está prestes a editar o personagem {{{characterName}}}. Use os botões abaixo para selecionar o que deseja editar.",
      view
    ),
    title: mustache.render("Edição de {{{characterName}}}", view),
    embedColor: character.expand.race[0].color,
    imageUrl: PocketBase.getImageUrl({
      record: character,
      fileName: character.image,
      thumb: true,
    }),
    fields: [
      new ButtonBuilder()
        .setLabel("Sobrenome")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(makeCustomId("surname")),
      new ButtonBuilder()
        .setLabel("Imagem")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(makeCustomId("image")),
      new ButtonBuilder()
        .setLabel("Personalidade")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(makeCustomId("personality")),
      new ButtonBuilder()
        .setLabel("História")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(makeCustomId("backstory")),
      new ButtonBuilder()
        .setLabel("Título")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(makeCustomId("title")),
      new StringSelectMenuBuilder()
        .setPlaceholder("Escolher nova facção")
        .setMaxValues(1)
        .setCustomId(makeCustomId("faction"))
        .setOptions(
          allFactions.items.map((faction) => {
            return new StringSelectMenuOptionBuilder().setLabel(faction.name).setValue(faction.id);
          })
        ),
    ],
  });
};
export default characterEditForm;
