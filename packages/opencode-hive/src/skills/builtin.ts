/**
 * Builtin Skills for Hive
 * 
 * Following OMO-Slim pattern - skills are loaded from templates.
 * This file provides the infrastructure to load builtin skills.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SkillDefinition, SkillLoadResult } from './types.js';

/**
 * List of builtin skill names.
 * These are loaded from packages/hive-core/templates/skills/
 */
export const BUILTIN_SKILLS = ['hive'] as const;
export type BuiltinSkillName = typeof BUILTIN_SKILLS[number];

/**
 * Parse skill frontmatter from markdown content.
 * Format:
 * ---
 * name: skill-name
 * description: Brief description
 * ---
 * ...content...
 */
function parseSkillFrontmatter(content: string): { name: string; description: string; template: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const template = match[2];

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  if (!nameMatch || !descMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
    template: template.trim(),
  };
}

/**
 * Get the templates directory path.
 * Resolves from hive-core package.
 */
function getTemplatesDir(): string {
  // In production: look relative to this file's location
  // packages/opencode-hive/src/skills/builtin.ts -> packages/hive-core/templates/skills/
  const possiblePaths = [
    // From dist (compiled)
    path.resolve(__dirname, '../../../../hive-core/templates/skills'),
    // From src (development)
    path.resolve(__dirname, '../../../hive-core/templates/skills'),
    // From package root
    path.resolve(process.cwd(), 'packages/hive-core/templates/skills'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Fallback
  return possiblePaths[0];
}

/**
 * Load a builtin skill by name.
 */
export function loadBuiltinSkill(name: string): SkillLoadResult {
  if (!BUILTIN_SKILLS.includes(name as BuiltinSkillName)) {
    return { found: false, error: `Unknown builtin skill: ${name}` };
  }

  const templatesDir = getTemplatesDir();
  const skillPath = path.join(templatesDir, `${name}.md`);

  if (!fs.existsSync(skillPath)) {
    return { found: false, error: `Skill file not found: ${skillPath}` };
  }

  const content = fs.readFileSync(skillPath, 'utf-8');
  const parsed = parseSkillFrontmatter(content);

  if (!parsed) {
    return { found: false, error: `Invalid skill format in ${skillPath}` };
  }

  return {
    found: true,
    skill: {
      name: parsed.name,
      description: parsed.description,
      template: parsed.template,
    },
    source: 'builtin',
  };
}

/**
 * Get all builtin skills.
 */
export function getBuiltinSkills(): SkillDefinition[] {
  return BUILTIN_SKILLS
    .map(name => loadBuiltinSkill(name))
    .filter(result => result.found)
    .map(result => result.skill!);
}

/**
 * Get skill metadata for tool description (XML format).
 */
export function getBuiltinSkillsXml(): string {
  const skills = getBuiltinSkills();
  const skillsXml = skills.map(s => 
    `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`
  ).join('\n');

  return `<available_skills>\n${skillsXml}\n</available_skills>`;
}
