export type TCharacterLeveling = {
  characterAscendedSkills?: string[];
  characterLevel?: number;
  characterPoints?: number;
  characterSkillsWithTraits?: string[];
  characterSpareSkillPoints?: number;
};

export class CharacterLeveling {
  public characterLevel: number;
  public characterSpareSkillPoints: number;
  public characterPoints: number;
  public characterSkills: Record<string, number>;
  public characterAscendedSkills: string[];
  public characterSkillsWithTraits: string[];
  public costPerLevel: number[];
  public maxLevel: number;

  constructor(
    maxLevel = 99,
    increaseFactor: number,
    skills: Record<string, number> = {},
    {
      characterLevel = 1,
      characterSpareSkillPoints = 0,
      characterPoints = 0,
      characterAscendedSkills = [],
      characterSkillsWithTraits = [],
    }: TCharacterLeveling
  ) {
    this.maxLevel = maxLevel;
    this.characterLevel = characterLevel;
    this.characterSpareSkillPoints = characterSpareSkillPoints;
    this.characterPoints = characterPoints;
    this.characterSkills = skills;
    this.characterAscendedSkills = characterAscendedSkills;
    this.characterSkillsWithTraits = characterSkillsWithTraits;
    this.costPerLevel = this.calculateCostPerLevel(increaseFactor);
  }

  public calculateCostPerLevel(increaseFactor: number): number[] {
    const cost: number[] = [];
    for (let level = 1; level <= this.maxLevel; level++) {
      cost[level] = Math.floor(
        level + 300 * Math.pow(2, level / increaseFactor)
      );
    }
    return cost;
  }

  public addCharacterPoints(amount: number): void {
    const traitMultiplier = 1 + 0.1 * this.characterSkillsWithTraits.length;
    this.characterPoints += Math.floor(amount * traitMultiplier);
  }

  public canLevelUpCharacter(): boolean {
    return (
      this.characterLevel < this.maxLevel &&
      this.characterPoints >= this.costPerLevel[this.characterLevel + 1]
    );
  }

  public levelUpCharacter(): boolean {
    if (this.canLevelUpCharacter()) {
      this.characterPoints -= this.costPerLevel[this.characterLevel + 1];
      this.characterLevel++;
      this.characterSpareSkillPoints += 10;
      return true;
    } else {
      return false;
    }
  }

  public canIncreaseSkill(skill: string): boolean {
    const isMax = this.characterSkills[skill] < this.maxLevel;
    const hasPoints = this.characterSpareSkillPoints > 0;
    const isAscended = this.characterAscendedSkills.includes(skill);

    if (isAscended) {
      return hasPoints;
    }
    return isMax && hasPoints;
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
