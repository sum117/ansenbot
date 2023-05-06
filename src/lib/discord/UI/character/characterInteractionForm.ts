import { ButtonBuilder, ButtonStyle } from "discord.js";

import type { Character } from "../../../../types/Character";
import MultiForm from "../classes/MultiForm";
import getInteractionMetadata from "../helpers/getInteractionMetadata";

export default async function characterInteractionForm(
  agent: Character,
  target: Character
): Promise<MultiForm> {
  const { render, imageUrl } = await getInteractionMetadata(agent, target);

  const buttons: Array<ButtonBuilder> = [
    new ButtonBuilder()
      .setCustomId(`character:interaction:attack:${agent.playerId}:${target.playerId}`)
      .setLabel("Atacar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⚔️"),

    new ButtonBuilder()
      .setCustomId(`character:interaction:support:${agent.playerId}:${target.playerId}`)
      .setLabel("Ajudar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🤝"),
  ];
  return new MultiForm({
    imageUrl,
    title: render("Interação entre {{{agent}}} e {{{target}}}"),
    description:
      "O amor não começa e termina do modo que pensamos. O amor é uma batalha, o amor é uma guerra; o amor é crescimento contínuo. — James Baldwin",
    fields: buttons,
  });
}
