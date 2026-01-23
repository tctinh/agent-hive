/**
 * Hive Skill System Types
 * 
 * Skill definitions for Hive.
 */

/**
 * Definition of a skill that can be loaded by agents.
 */
export interface SkillDefinition {
  /** Unique identifier for the skill */
  name: string;
  
  /** Brief description shown in available_skills list */
  description: string;
  
  /** Markdown content with detailed instructions */
  template: string;
}

/**
 * Result returned when loading a skill.
 */
export interface SkillLoadResult {
  /** Whether the skill was found */
  found: boolean;
  
  /** The loaded skill definition if found */
  skill?: SkillDefinition;
  
  /** Error message if not found */
  error?: string;
  
  /** Source of the skill (builtin or file path) */
  source?: 'builtin' | string;
}
