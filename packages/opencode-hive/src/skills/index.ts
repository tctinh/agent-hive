/**
 * Hive Skills System
 *
 * Export skill infrastructure for native materialization and bundled skill metadata.
 */

export type { SkillDefinition, SkillLoadResult } from './types.js';
export { BUILTIN_SKILLS, BUILTIN_SKILL_NAMES, getBuiltinSkills } from './builtin.js';
export {
  parseNativeSkillMarkdown,
  prepareNativeHiveSkills,
  resolvePackagedSkillsDir,
  type ParsedNativeSkill,
  type PreparedHiveSkill,
  type PreparedNativeHiveSkills,
  type PrepareNativeHiveSkillsInput,
} from './native-materializer.js';
