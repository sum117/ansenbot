import type { CommandInteraction } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { Discord, Slash } from "discordx";

import logger from "../../utils/loggerFactory";

@Discord()
export class RestartBot {
  @Slash({
    name: "restart_bot",
    defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
    description: "Reinicia o bot em caso de emergência.",
  })
  public async main(interaction: CommandInteraction): Promise<void> {
    await interaction.reply("Reiniciando o bot.").catch(logger.error);
    process.exit(1);
  }
}
