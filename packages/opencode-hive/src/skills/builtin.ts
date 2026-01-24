/**
 * Builtin Skills for Hive
 * 
 * Skills are loaded from the generated registry.
 * This file provides the infrastructure to load builtin skills.
 */

import type { SkillDefinition, SkillLoadResult } from './types.js';
import { BUILTIN_SKILL_NAMES, BUILTIN_SKILLS } from './registry.generated.js';

// Re-export for external use
export { BUILTIN_SKILL_NAMES, BUILTIN_SKILLS };

/**
 * Type for builtin skill names.
 */
export type BuiltinSkillName = typeof BUILTIN_SKILL_NAMES[number];

/**
 * Load a builtin skill by name.
 */
export function loadBuiltinSkill(name: string): SkillLoadResult {
  const skill = BUILTIN_SKILLS.find(s => s.name === name);

  if (!skill) {
    return { 
      found: false, 
      error: `Unknown builtin skill: ${name}. Available: ${BUILTIN_SKILL_NAMES.join(', ')}` 
    };
  }

  return {
    found: true,
    skill,
    source: 'builtin',
  };
}

/**
 * Get all builtin skills.
 */
export function getBuiltinSkills(): SkillDefinition[] {
  return BUILTIN_SKILLS;
}

/**
 * Get filtered skills based on global disable list and optional per-agent enable list.
 * 
 * Logic:
 * 1. Start with all builtin skills
 * 2. Remove globally disabled skills
 * 3. If agentSkills is provided and non-empty, intersect with that list
 * 
 * @param disabledSkills - Skills to globally disable
 * @param agentSkills - If provided, only these skills are enabled for the agent (intersection)
 */
export function getFilteredSkills(
  disabledSkills: string[] = [],
  agentSkills?: string[]
): SkillDefinition[] {
  const disabled = new Set(disabledSkills);
  
  // Filter out globally disabled skills
  let filtered = BUILTIN_SKILLS.filter(s => !disabled.has(s.name));
  
  // If agent has specific skills configured, only allow those
  if (agentSkills && agentSkills.length > 0) {
    const enabled = new Set(agentSkills);
    filtered = filtered.filter(s => enabled.has(s.name));
  }
  
  return filtered;
}

/**
 * Get skill metadata for tool description (XML format).
 * Uses (hive - Skill) prefix for consistency with formatSkillsXml in index.ts.
 */
export function getBuiltinSkillsXml(): string {
  const skillsXml = BUILTIN_SKILLS.map(s => 
    `  <skill>\n    <name>${s.name}</name>\n    <description>(hive - Skill) ${s.description}</description>\n  </skill>`
  ).join('\n');

  return `<available_skills>\n${skillsXml}\n</available_skills>`;
}
