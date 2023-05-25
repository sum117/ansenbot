export class PocketBaseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BotError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CombatError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
