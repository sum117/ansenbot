import { EmbedBuilder } from "discord.js";

import type { Channel } from "../../../../types/Channel";
import PocketBase from "../../../pocketbase/PocketBase";

export const channelPlaceHolderEmbed = (record: Channel): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(record.name)
    .setDescription(record.description.length > 1 ? record.description : "Sem descrição")
    .setFields(
      { name: "Seguro", value: record.isSafe ? "🍖 Sim" : "💀 Não", inline: true },
      { name: "Recursos", value: record.hasSpirit ? "👻 Sim" : "❌ Não", inline: true }
    )
    .setColor("Random")
    .setTimestamp(Date.now());

  if (record.image) {
    embed.setImage(
      PocketBase.getImageUrl({
        record,
        fileName: record.image,
      })
    );
  }

  return embed;
};
