import { ButtonInteraction, Snowflake } from "discord.js";

export default class TrackedInteraction {
  public cache = new Map<Snowflake, ButtonInteraction>();

  public async getOrCreateTrackedInteraction(
    interaction: ButtonInteraction,
    resetKey: string,
    ephemeral = false
  ) {
    let trackedInteraction = this.cache.get(interaction.user.id);

    if (interaction.customId.includes(resetKey) && trackedInteraction) {
      await trackedInteraction.deleteReply().catch(() => null);
      this.cache.delete(interaction.user.id);
      trackedInteraction = undefined;
    }

    if (!trackedInteraction) {
      await interaction.deferReply({ ephemeral });
      this.cache.set(interaction.user.id, interaction);
      trackedInteraction = interaction;
    }
    this.shouldRecreate(trackedInteraction, interaction);
    return trackedInteraction;
  }

  private shouldRecreate(
    trackedInteraction: ButtonInteraction,
    interaction: ButtonInteraction
  ): boolean {
    const isEqualInteraction = trackedInteraction?.id !== interaction.id;
    if (isEqualInteraction) {
      void interaction.deferReply();
      void interaction.deleteReply();
      return true;
    }

    return false;
  }
}
