import type { ChatInputCommandInteraction, User } from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

import { MATERIALS_NAMES } from "../../data/constants";
import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import { userChoice } from "../../lib/discord/UI/character/characterInteractionChoices";
import getSafeEntries from "../../utils/getSafeEntries";
import handleError from "../../utils/handleError";

@Discord()
export class CharacterPayController {
  @Slash({ name: "pagar", description: "Paga um personagem com lascas espirituais." })
  async main(
    @SlashOption(userChoice)
    selectedUser: User,
    @SlashOption({
      type: ApplicationCommandOptionType.String,
      name: "recurso",
      description: "O recurso a ser pago.",
      autocomplete: (interaction) => {
        const choices = getSafeEntries(MATERIALS_NAMES).map(([key, value]) => ({
          value: key,
          name: value,
        }));
        return interaction.respond(choices);
      },
    })
    resource: keyof typeof MATERIALS_NAMES | "spirit",
    @SlashOption({
      type: ApplicationCommandOptionType.Number,
      name: "quantidade",
      description: "Quantidade de lascas espirituais a serem pagas.",
    })
    amount: number,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      if (typeof amount !== "number" || amount <= 0) {
        amount = 1;
      }
      await interaction.deferReply();
      const { characterManager: agentManager } = await getRoleplayDataFromUserId(
        interaction.user.id
      );
      const { characterManager: targetManager } = await getRoleplayDataFromUserId(selectedUser.id);

      if (!(resource in MATERIALS_NAMES)) {
        resource = "spirit";
      }

      const message = await agentManager.pay(resource, amount, targetManager);
      await interaction.editReply(message);
    } catch (error) {
      handleError(interaction, error);
    }
  }
}
