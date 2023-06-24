import type { CommandInteraction } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { Discord, Slash } from "discordx";

@Discord()
export class RestartBot {
  @Slash({
    name: "restart_bot",
    defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
    description: "Reinicia o bot em caso de emergência.",
  })
  public main(interaction: CommandInteraction): void {
    interaction.reply("Reiniciando o bot...");
    process.exit(1);
  }
}
