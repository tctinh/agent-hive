# PR #6 Skill Implementation Reference

## Key Code from PR #6 to Adapt

### HiveSkill Interface
```typescript
interface HiveSkill {
  name: string;
  description: string;
  path: string;
  body: string;
}
```

### parseFrontmatter Function
```typescript
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  
  const frontmatter: Record<string, string> = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
    }
  });
  return { frontmatter, body: match[2] };
}
```

### discoverHiveSkills Function
Scans `skills/<name>/SKILL.md` directories and returns skill objects.

### formatSkillsXml Function
Creates `<available_skills>` XML list for tool description.

### hive_skill Tool
- Discovers all skills at initialization
- Caches skill list
- Returns skill body when called with name
- Shows available skills in description

## hive-execution Skill Content (294 lines)

The skill covers:
1. **Pre-execution checklist** - feature exists, plan approved, tasks synced, base clean
2. **Sequential execution** - single executor, tasks in order
3. **Parallel execution** - multiple executors, phases, blockers
4. **Task lifecycle**: hive_exec_start → implement → hive_exec_complete → hive_merge(strategy=squash)
5. **Tool quick reference table**
6. **Commit discipline** - one commit per task, "hive(task): summary" format
7. **Error recovery** - exec_abort, merge conflicts, blocker handling
8. **Verification gate checklist**

## Skills Directory Structure (from PR #6)

```
packages/opencode-hive/
├── skills/
│   ├── decision/
│   │   └── SKILL.md
│   ├── plan/
│   │   └── SKILL.md
│   ├── step-log/
│   │   └── SKILL.md
│   └── hive-execution/
│       └── SKILL.md
├── package.json  # "files": ["dist/", "skills/"]
└── src/
    └── index.ts  # hive_skill tool
```
