import type { EmbedField } from "discord.js";
import mustache from "mustache";

import type { Character } from "../../../../types/Character";
import getCombinedImageUrl from "../../../../utils/getCombinedImageUrl";
import PocketBase from "../../../pocketbase/PocketBase";
import getCharEffects from "./getCharEffects";
import getStatusBars from "./getStatusBars";

export interface InteractionMetadataResult {
  render: (template: string) => string;
  imageUrl: string;
  infoFields: Array<EmbedField>;
}

export default async function getInteractionMetadata(
  agent: Character,
  target: Character
): Promise<InteractionMetadataResult> {
  const view = {
    agent: agent.name,
    target: target.name,
  };

  const render = (template: string) => mustache.render(template, view);

  const [attackerImage, targetImage] = [
    PocketBase.getImageUrl({ record: agent, fileName: agent.image }).replace(
      `${process.env.POCKETBASE_URL}api/files/`,
      ""
    ),
    PocketBase.getImageUrl({ record: target, fileName: target.image }).replace(
      `${process.env.POCKETBASE_URL}api/files/`,
      ""
    ),
  ];
  const imageUrl = getCombinedImageUrl(targetImage, attackerImage);
  const [agentEffects, targetEffects] = await Promise.all([
    getCharEffects(agent.expand.status),
    getCharEffects(target.expand.status),
  ]);

  return {
    render,
    imageUrl,
    infoFields: [
      {
        name: render("Status de {{{agent}}}"),
        value: getStatusBars(agent.expand.skills, agent.expand.status).join("\n"),
        inline: true,
      },
      {
        name: render("Status de {{{target}}}"),
        value: getStatusBars(target.expand.skills, target.expand.status).join("\n"),
        inline: true,
      },
      {
        name: " ",
        value: " ",
        inline: false,
      },
      {
        name: render("Efeitos de {{{agent}}}"),
        value: agentEffects.join("\n"),
        inline: true,
      },
      {
        name: render("Efeitos de {{{target}}}"),
        value: targetEffects.join("\n"),
        inline: true,
      },
    ],
  };
}
