import type { ChatInputCommandInteraction, User } from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

import getRoleplayDataFromUserId from "../../lib/discord/Character/helpers/getRoleplayDataFromUserId";
import { userChoice } from "../../lib/discord/UI/character/characterInteractionChoices";
import handleError from "../../utils/handleError";

@Discord()
export class CharacterPayController {
  @Slash({ name: "pagar", description: "Paga um personagem com lascas espirituais." })
  async main(
    @SlashOption(userChoice)
    selectedUser: User,
    @SlashOption({
      type: ApplicationCommandOptionType.Number,
      name: "quantidade",
      description: "Quantidade de lascas espirituais a serem pagas.",
    })
    amount: number,
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply();
      const { characterManager: agentManager } = await getRoleplayDataFromUserId(
        interaction.user.id
      );
      const { characterManager: targetManager } = await getRoleplayDataFromUserId(selectedUser.id);
      const message = await agentManager.pay(amount, targetManager);
      await interaction.editReply(message);
    } catch (error) {
      handleError(interaction, error);
    }
  }
}
