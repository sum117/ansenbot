import type { ButtonInteraction, SelectMenuInteraction, SelectMenuOptionBuilder } from "discord.js";
import {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { DestinyMaiden, Faction, Race, Spec } from "../../../../types/Character";
import type { Form } from "../../../../types/MultiForm";
import PocketBase from "../../../pocketbase/PocketBase";
import MultiForm from "../MultiForm";

const characterCreateForm = async (
  interaction: ButtonInteraction | SelectMenuInteraction
): Promise<{ totalSteps: number; step: Form; prompt: MultiForm }> => {
  const [_, state, stepId] = interaction.customId.split(":");
  const stepsAmount = (
    await PocketBase.getAllEntities<Form>({
      entityType: "forms",
      page: 1,
    })
  ).totalItems;

  const currentStep =
    Number(stepId) < 1 ? 1 : Number(stepId) > stepsAmount ? stepsAmount : Number(stepId);
  const nextStep = currentStep + 1;
  const previousStep = currentStep - 1;
  const step = await PocketBase.getFirstListEntity<Form>({
    entityType: "forms",
    filter: [`step=${currentStep}`, {}],
  });
  const stepData = await PocketBase.getAllEntities<Faction | Race | Spec | DestinyMaiden>({
    entityType: step.collection,
    page: 1,
  });
  const temp: Array<SelectMenuOptionBuilder | ButtonBuilder> = [];
  for (const item of stepData.items) {
    if (step.isSelectMenu) {
      temp.push(new StringSelectMenuOptionBuilder().setLabel(item.name).setValue(item.id));
    } else {
      temp.push(
        new ButtonBuilder()
          .setCustomId(`createCharChoice:${state}:${currentStep}:${item.id}`)
          .setLabel(item.name)
          .setStyle(ButtonStyle.Secondary)
      );
    }
  }

  const fields = (() => {
    if (!step.isSelectMenu) {
      return temp as ButtonBuilder[];
    }
    return [
      new StringSelectMenuBuilder()
        .setMaxValues(2)
        .setCustomId(`createCharChoice:${state}:${currentStep}:${step.collection}`)
        .setPlaceholder("Selecione até duas opções.")
        .setOptions(temp as StringSelectMenuOptionBuilder[]),
    ];
  })();

  const actionButtons = [
    new ButtonBuilder()
      .setLabel("Continuar")
      .setStyle(ButtonStyle.Success)
      .setCustomId(`createChar:creating:${nextStep}:null`),
    new ButtonBuilder()
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger)
      .setCustomId("createChar:cancel:0:null"),
    new ButtonBuilder()
      .setLabel("Voltar")
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`createChar:creating:${previousStep}:null`),
  ];

  return {
    prompt: new MultiForm({
      description: step.description,
      title: step.title,
      embedColor: "Grey",
      fields,
      imageUrl: PocketBase.getImageUrl({
        record: step,
        fileName: step.image,
      }),
      controller: true,
      controlFields: actionButtons,
    }),
    step,
    totalSteps: stepsAmount,
  };
};

export default characterCreateForm;
