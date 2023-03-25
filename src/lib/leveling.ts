export class Leveling {
  public characterLevel: number;
  public characterPoints: number;
  public skills: number[];
  public costPerLevel: number[];

  constructor(increaseFactor: number) {
    this.characterLevel = 1;
    this.characterPoints = 0;
    this.skills = new Array(10).fill(0);
    this.costPerLevel = this.calculateCostPerLevel(increaseFactor);
  }

  public calculateCostPerLevel(increaseFactor: number): number[] {
    const cost: number[] = [];
    for (let level = 1; level <= 99; level++) {
      cost[level] = Math.floor(
        level + 300 * Math.pow(2, level / increaseFactor)
      );
    }
    return cost;
  }

  public addCharacterPoints(amount: number): void {
    this.characterPoints += amount;
  }

  public canLevelUpCharacter(): boolean {
    return (
      this.characterLevel < 99 &&
      this.characterPoints >= this.costPerLevel[this.characterLevel + 1]
    );
  }

  public levelUpCharacter(): boolean {
    if (this.canLevelUpCharacter()) {
      this.characterPoints -= this.costPerLevel[this.characterLevel + 1];
      this.characterLevel++;
      return true;
    } else {
      return false;
    }
  }

  public canIncreaseSkill(skill: number): boolean {
    return this.skills[skill] < 99 && this.characterLevel > this.skills[skill];
  }

  public increaseSkill(skill: number): boolean {
    if (this.canIncreaseSkill(skill)) {
      this.skills[skill]++;
      this.characterLevel--;
      return true;
    } else {
      return false;
    }
  }
}

// const user = new Leveling(7.01);
// console.log(user.costPerLevel);
// user.addCharacterPoints(4096);

// while (user.canLevelUpCharacter()) {
//   user.levelUpCharacter();
// }
