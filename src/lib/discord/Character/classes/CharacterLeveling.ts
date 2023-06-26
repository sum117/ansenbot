import type { Character, SanitizedSkill, Skills } from "../../../../types/Character";
import type { PocketBaseConstants } from "../../../../types/PocketBaseCRUD";

export class CharacterLeveling {
  public characterLevel: number;
  public characterSpareSkillPoints: number;
  public characterXp: number;
  public characterSkills: Partial<Omit<Skills, keyof PocketBaseConstants | "character" | "expand">>;
  public characterAscendedSkills: string[];
  public characterSkillsWithTraits: string[];
  public costPerLevel: number[];
  public maxLevel: number;

  constructor(
    maxLevel = 99,
    increaseFactor: number,
    skills: SanitizedSkill,
    { level = 1, skillPoints = 0, xp = 0, ascendedSkills = [], skillTraits = [] }: Character
  ) {
    this.maxLevel = maxLevel;
    this.characterLevel = level;
    this.characterSpareSkillPoints = skillPoints;
    this.characterXp = xp;
    this.characterSkills = skills;
    this.characterAscendedSkills = ascendedSkills;
    this.characterSkillsWithTraits = skillTraits;
    this.costPerLevel = this.calculateCostPerLevel(increaseFactor);
  }

  public calculateCostPerLevel(increaseFactor: number): number[] {
    const cost: number[] = [];
    for (let level = 1; level <= this.maxLevel; level++) {
      cost[level] = Math.floor(level + 300 * Math.pow(2, level / increaseFactor));
    }
    return cost;
  }

  public addCharacterPoints(amount: number): void {
    const traitMultiplier = 1 + 0.1 * this.characterSkillsWithTraits.length;
    this.characterXp += Math.floor(amount * traitMultiplier);
  }

  public canLevelUpCharacter(): boolean {
    return (
      this.characterLevel < this.maxLevel &&
      this.characterXp >= this.costPerLevel[this.characterLevel + 1]
    );
  }

  public levelUpCharacter(): boolean {
    if (this.canLevelUpCharacter()) {
      this.characterXp -= this.costPerLevel[this.characterLevel + 1];
      this.characterLevel++;
      this.characterSpareSkillPoints += 10;
      return true;
    } else {
      return false;
    }
  }

  public canIncreaseSkill(skill: keyof typeof this.characterSkills): boolean {
    const level = this.characterSkills[skill];
    if (level === undefined) {
      return false;
    }
    const isMax = level < this.maxLevel;
    const hasPoints = this.characterSpareSkillPoints > 0;
    const isAscended = this.characterAscendedSkills.includes(skill);

    if (isAscended) {
      return hasPoints;
    }
    return isMax && hasPoints;
  }

  public increaseSkill(skill: keyof SanitizedSkill): boolean {
    if (this.canIncreaseSkill(skill)) {
      const level = this.characterSkills[skill];
      if (level === undefined) {
        return false;
      }
      this.characterSkills[skill] = level + 1;
      this.characterSpareSkillPoints--;
      return true;
    } else {
      return false;
    }
  }
}
