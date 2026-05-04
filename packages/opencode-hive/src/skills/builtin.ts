import type { SkillDefinition } from './types.js';
import { BUILTIN_SKILL_NAMES, BUILTIN_SKILLS } from './registry.generated.js';

export { BUILTIN_SKILL_NAMES, BUILTIN_SKILLS };

export function getBuiltinSkills(): SkillDefinition[] {
  return BUILTIN_SKILLS;
}
