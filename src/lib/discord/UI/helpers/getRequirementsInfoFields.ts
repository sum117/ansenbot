import type { EmbedField } from "discord.js";
import { bold } from "discord.js";

import { equipmentDictionary, skillsDictionary } from "../../../../data/translations";
import type { PartialRequirements } from "../../../../types/Item";
import formatItemRequirements from "./formatItemRequirements";

type RequirementsInfoFields = {
  quotient: number;
  multiplier: number;
  type: keyof typeof skillsDictionary;
  slot: keyof typeof equipmentDictionary;
  rarity: string;
  requirements: PartialRequirements;
};

export const getRequirementsInfoFields = ({
  quotient,
  multiplier,
  type,
  slot,
  requirements,
  rarity,
}: RequirementsInfoFields): Array<EmbedField> => {
  const fields = [
    {
      inline: true,
      name: "Quociente de Qualidade",
      value: String(quotient),
    },
    {
      inline: true,
      name: "Multiplicador de Poder",
      value: String(multiplier),
    },
    {
      inline: true,
      name: "Tipo de Aflição",
      value: skillsDictionary[type],
    },

    {
      inline: true,
      name: "Slot",
      value: equipmentDictionary[slot],
    },
    {
      inline: true,
      name: "Raridade",
      value: bold(rarity.toUpperCase()),
    },
  ];

  const formattedRequirements = formatItemRequirements(requirements);
  if (formattedRequirements) {
    fields.push({
      inline: true,
      name: "Requisitos",
      value: formattedRequirements,
    });
  }

  return fields;
};
