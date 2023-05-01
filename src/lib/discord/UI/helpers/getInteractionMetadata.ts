import { Character } from "../../../../types/Character";
import mustache from "mustache";
import getPocketbaseImageUrl from "../../../../utils/getPocketbaseImageUrl";
import getCombinedImageUrl from "../../../../utils/getCombinedImageUrl";
import getCharEffects from "./getCharEffects";
import getStatusBars from "./getStatusBars";

export default async function getInteractionMetadata(agent: Character, target: Character) {
  const view = {
    agent: agent.name,
    target: target.name,
  };

  const render = (template: string) => mustache.render(template, view);

  const [attackerImage, targetImage] = [
    getPocketbaseImageUrl(agent),
    getPocketbaseImageUrl(target),
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
