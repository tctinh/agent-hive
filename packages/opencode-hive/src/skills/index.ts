/**
 * Hive Skills System
 * 
 * Export skill infrastructure for native materialization and legacy skill loading.
 */

export type { SkillDefinition, SkillLoadResult } from './types.js';
export { 
  BUILTIN_SKILLS, 
  loadBuiltinSkill, 
  getBuiltinSkills,
  getFilteredSkills,
  getBuiltinSkillsXml,
  type BuiltinSkillName 
} from './builtin.js';
export { loadFileSkill } from './file-loader.js';
export {
  parseNativeSkillMarkdown,
  prepareNativeHiveSkills,
  resolvePackagedSkillsDir,
  type ParsedNativeSkill,
  type PreparedHiveSkill,
  type PreparedNativeHiveSkills,
  type PrepareNativeHiveSkillsInput,
} from './native-materializer.js';
