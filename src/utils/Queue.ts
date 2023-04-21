export default class Queue {
  private tasks: (() => Promise<void>)[] = [];
  private isRunning = false;

  async enqueue(task: () => Promise<void>): Promise<void> {
    this.tasks.push(task);
    if (!this.isRunning) {
      this.isRunning = true;
      await this.processTasks();
      this.isRunning = false;
    }
  }

  private async processTasks(): Promise<void> {
    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (task) {
        await task();
      }
    }
  }
}
