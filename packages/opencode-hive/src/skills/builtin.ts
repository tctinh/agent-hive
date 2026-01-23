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
 * Get skill metadata for tool description (XML format).
 * Uses (hive - Skill) prefix for consistency with formatSkillsXml in index.ts.
 */
export function getBuiltinSkillsXml(): string {
  const skillsXml = BUILTIN_SKILLS.map(s => 
    `  <skill>\n    <name>${s.name}</name>\n    <description>(hive - Skill) ${s.description}</description>\n  </skill>`
  ).join('\n');

  return `<available_skills>\n${skillsXml}\n</available_skills>`;
}
