import { ButtonBuilder, ButtonStyle } from "discord.js";

import MultiForm from "../classes/MultiForm";

const characterCreateTrigger = new MultiForm({
  description:
    "É nesse canal que você criará seu personagem. Simplesmente aperte no botão abaixo para prosseguir.\n\nAntes de começar, recomendamos a leitura dos posts do fórum que são relevantes para o que você tem em mente.\n\n***\n\n*Ah... você não tem ideia de onde se meteu. Mas agora que já está aqui, me diga... com qual aparência deseja morrer?*",
  title: "Criação de Personagem",
  embedColor: "Grey",
  imageUrl: "https://i.imgur.com/qlN2bRX.png",
  fields: [
    new ButtonBuilder()
      .setLabel("Criar Personagem")
      .setStyle(ButtonStyle.Success)
      .setCustomId("createChar:start:1:null")
      .setEmoji("👤"),
  ],
});

export default characterCreateTrigger;
