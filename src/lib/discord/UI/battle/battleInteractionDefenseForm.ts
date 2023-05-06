import { ButtonBuilder, ButtonStyle, userMention } from "discord.js";

import type { Character } from "../../../../types/Character";
import MultiForm from "../classes/MultiForm";
import getInteractionMetadata from "../helpers/getInteractionMetadata";

export default async function battleInteractionDefenseForm(
  agent: Character,
  target: Character
): Promise<MultiForm> {
  const { render, imageUrl, infoFields } = await getInteractionMetadata(agent, target);

  const fields = [
    new ButtonBuilder()
      .setCustomId(`battle:defense:block:${agent.playerId}:${target.playerId}`)
      .setLabel("Bloquear")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🛡️")
      .setDisabled(agent.expand.body.expand?.leftArm?.isWeapon ?? true),
    new ButtonBuilder()
      .setCustomId(`battle:defense:dodge:${agent.playerId}:${target.playerId}`)
      .setLabel("Esquivar")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("💨"),
    new ButtonBuilder()
      .setCustomId(`battle:defense:counter:${agent.playerId}:${target.playerId}`)
      .setLabel("Contra-Atacar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🤺"),
    new ButtonBuilder()
      .setCustomId(`battle:defense:flee:${agent.playerId}:${target.playerId}`)
      .setLabel("Fugir")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🏃‍♂️"),
  ];
  const description: Array<string> = [];
  description.push("{{agent}} está te atacando, {{target}}. Prepare-se para se defender!");
  description.push(
    "Nesse momento, utilize o que precisar para se salvar. Trocar de itens durante o combate é permitido. Boa sorte!"
  );
  description.push(
    '"Quando um ataque acontece , a melhor defesa não é resistir, mas mover-se com o fluxo do ataque, e , usar essa energia em benefício de si próprio." — Bruce Lee'
  );
  description.push(
    "💡 Colocar um escudo na mão esquerda permite que você use o botão de bloqueio."
  );

  description.push("⏳ Você tem até 5 minutos para se defender.");
  const form = new MultiForm({
    description: render(description.join("\n\n")),
    title: "Defesa",
    fields,
    imageUrl,
  });
  form.setMessageContent(userMention(target.playerId));
  form.addEmbedFields(infoFields);

  return form;
}
