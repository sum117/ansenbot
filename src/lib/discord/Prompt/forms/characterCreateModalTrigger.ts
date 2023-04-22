import { ButtonBuilder, ButtonStyle } from "discord.js";

import MultiForm from "../MultiForm";

const characterCreateTrigger = (canFinish: boolean, fallbackStep: string) =>
  new MultiForm({
    description:
      "Agora só falta você preencher os formulários. Você pode usar os botões abaixo para refazer o formulário ou continuar.",
    title: "Finalizando Criação de Personagem",
    embedColor: "Grey",
    fields: [
      new ButtonBuilder()
        .setLabel("Campos Obrigatórios")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("createChar:modal:required")
        .setEmoji("❗"),
      new ButtonBuilder()
        .setLabel("Campos Opcionais")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("createChar:modal:optional")
        .setEmoji("❓"),
    ],
    controlFields: [
      new ButtonBuilder()
        .setLabel("Finalizar")
        .setDisabled(!canFinish)
        .setStyle(ButtonStyle.Success)
        .setCustomId("createChar:modal:done"),
      new ButtonBuilder()
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
        .setCustomId("createChar:cancel:0:null"),
      new ButtonBuilder()
        .setLabel("Voltar")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`createChar:creating:${fallbackStep}:null`),
    ],
    controller: true,
  });

export default characterCreateTrigger;
