import { EmbedBuilder } from "discord.js";
import PocketBase from "../../pocketbase/PocketBase";
import { Channel } from "../../../types/Channel";

export const channelPlaceHolderEmbed = (record: Channel) => {
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
