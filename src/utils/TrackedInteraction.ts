import type { ButtonInteraction, Snowflake } from "discord.js";

export default class TrackedInteraction {
  public cache = new Map<Snowflake, ButtonInteraction>();
  private timers = new Map<Snowflake, NodeJS.Timeout>();

  public async getOrCreateTrackedInteraction(
    interaction: ButtonInteraction,
    resetKey: string,
    ephemeral = false
  ): Promise<ButtonInteraction> {
    let trackedInteraction = this.cache.get(interaction.user.id);

    if (interaction.customId.includes(resetKey) && trackedInteraction) {
      await trackedInteraction.deleteReply().catch(() => null);
      this.deleteInteractionFromCache(interaction.user.id);
      trackedInteraction = undefined;
    }

    if (!trackedInteraction) {
      await interaction.deferReply({ ephemeral });
      this.cache.set(interaction.user.id, interaction);
      this.setDeletionTimer(interaction.user.id);
      trackedInteraction = interaction;
    }
    this.handleEqualInteraction(trackedInteraction, interaction);
    return trackedInteraction;
  }

  private async handleEqualInteraction(
    trackedInteraction: ButtonInteraction,
    interaction: ButtonInteraction
  ): Promise<void> {
    const isEqualInteraction = trackedInteraction?.id !== interaction.id;
    if (isEqualInteraction) {
      await interaction.deferReply();
      await interaction.deleteReply().catch(() => null);
    }
  }

  private setDeletionTimer(userId: Snowflake): void {
    const timer = setTimeout(() => {
      this.deleteInteractionFromCache(userId);
    }, 15 * 60 * 1000);

    this.timers.set(userId, timer);
  }

  private deleteInteractionFromCache(userId: Snowflake): void {
    this.cache.delete(userId);
    const timer = this.timers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(userId);
    }
  }
}
