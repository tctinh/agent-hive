import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const sourceSkillsDir = path.join(repoRoot, '.github', 'skills');
const targetSkillsDir = path.join(packageDir, 'skills');
const repoSkillReferencePattern = /\.github\/skills\/([^/\s)]+)\/SKILL\.md/g;

function normalizeSkillReferences(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      normalizeSkillReferences(entryPath);
      continue;
    }

    if (!entry.name.endsWith('.md')) {
      continue;
    }

    const originalContent = readFileSync(entryPath, 'utf8');
    const normalizedContent = originalContent.replace(repoSkillReferencePattern, '../$1/SKILL.md');

    if (normalizedContent !== originalContent) {
      writeFileSync(entryPath, normalizedContent);
    }
  }
}

if (!existsSync(sourceSkillsDir)) {
  throw new Error(`Shared skills directory not found: ${sourceSkillsDir}`);
}

rmSync(targetSkillsDir, { recursive: true, force: true });
mkdirSync(targetSkillsDir, { recursive: true });

const copiedSkills = readdirSync(sourceSkillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const skillName of copiedSkills) {
  cpSync(path.join(sourceSkillsDir, skillName), path.join(targetSkillsDir, skillName), {
    recursive: true,
  });
  normalizeSkillReferences(path.join(targetSkillsDir, skillName));
}

console.log(`Generated ${copiedSkills.length} skill directories into ${targetSkillsDir}`);