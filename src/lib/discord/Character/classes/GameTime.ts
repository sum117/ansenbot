export class GameClock {
  private realToGameRatio: number;
  private startTime: number;
  private days: number;

  constructor(realToGameRatio = 8, startTime?: number | Date) {
    this.realToGameRatio = realToGameRatio;
    this.startTime = GameClock.getInitialTime(startTime);
    this.days = 0;
  }

  private static getInitialTime(startTime?: number | Date): number {
    if (startTime instanceof Date) {
      return startTime.getTime();
    } else if (typeof startTime === "number") {
      return startTime;
    } else {
      return Date.now();
    }
  }

  getCurrentGameTime(): number {
    const elapsedRealTime = Date.now() - this.startTime;
    const elapsedGameTime = elapsedRealTime * this.realToGameRatio;
    this.checkForNewDay(elapsedGameTime);
    return elapsedGameTime;
  }

  checkForNewDay(elapsedGameTime: number): void {
    const currentDays = Math.floor(elapsedGameTime / (1000 * 3600 * 24));
    if (currentDays > this.days) {
      this.days = currentDays;
    }
  }

  formatGameTime(gameTime: number): string {
    const totalSeconds = Math.floor(gameTime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds / 3600) % 24);
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const seconds = totalSeconds % 60;
    return `${days} dias, ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  updateClock(): string {
    const gameTime = this.getCurrentGameTime();
    const formattedGameTime = this.formatGameTime(gameTime);
    return formattedGameTime;
  }
}
