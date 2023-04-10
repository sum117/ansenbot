export type TCharacterLeveling = {
  characterLevel?: number;
  characterPoints?: number;
  characterSpareSkillPoints?: number;
};

export class CharacterLeveling {
  public characterLevel: number;
  public characterSpareSkillPoints: number;
  public characterPoints: number;
  public characterSkills: Record<string, number>;
  public costPerLevel: number[];

  constructor(
    increaseFactor: number,
    skills: Record<string, number> = {},
    { characterLevel = 1, characterSpareSkillPoints = 0, characterPoints = 0 }: TCharacterLeveling
  ) {
    this.characterLevel = characterLevel;
    this.characterSpareSkillPoints = characterSpareSkillPoints;
    this.characterPoints = characterPoints;
    this.characterSkills = skills;
    this.costPerLevel = this.calculateCostPerLevel(increaseFactor);
  }

  public calculateCostPerLevel(increaseFactor: number): number[] {
    const cost: number[] = [];
    for (let level = 1; level <= 99; level++) {
      cost[level] = Math.floor(level + 300 * Math.pow(2, level / increaseFactor));
    }
    return cost;
  }

  public addCharacterPoints(amount: number): void {
    this.characterPoints += amount;
  }

  public canLevelUpCharacter(): boolean {
    return (
      this.characterLevel < 99 && this.characterPoints >= this.costPerLevel[this.characterLevel + 1]
    );
  }

  public levelUpCharacter(): boolean {
    if (this.canLevelUpCharacter()) {
      this.characterPoints -= this.costPerLevel[this.characterLevel + 1];
      this.characterLevel++;
      this.characterSpareSkillPoints++;
      return true;
    } else {
      return false;
    }
  }

  public canIncreaseSkill(skill: string): boolean {
    return this.characterSkills[skill] < 99 && this.characterLevel > this.characterSkills[skill];
  }

  public increaseSkill(skill: string): boolean {
    if (this.canIncreaseSkill(skill)) {
      this.characterSkills[skill]++;
      this.characterSpareSkillPoints--;
      return true;
    } else {
      return false;
    }
  }
}

// while (user.canLevelUpCharacter()) {
//   console.log(user.levelUpCharacter());
// }
