---
name: ast-grep
description: Use ast-grep MCP tools for syntax-aware structural search, AST inspection, rule testing, and structural verification. Triggers: code-shape queries, structural invariants, pattern debugging, AST inspection, and multi-file syntax matching.
---

# ast-grep MCP Workflow

## When to use this skill

Use this skill when the question depends on code structure rather than plain text.

Good fits:
- Find all code matching a syntax shape.
- Verify a structural invariant across files.
- Debug why a pattern does or does not match.
- Inspect the AST or pattern structure before writing a rule.
- Plan or verify structural rewrite targets before editing.

Do not use ast-grep as the default repo navigation tool when `cymbal` can answer the question more directly.

## Tool map

This local setup uses the official `ast-grep/ast-grep-mcp` server. Do not assume extra MCP tools exist beyond the four tools below.

- `ast_grep_dump_syntax_tree`
  - Use to inspect target code or understand how a pattern is parsed.
  - `format: cst` shows concrete syntax.
  - `format: ast` shows named syntax nodes.
  - `format: pattern` shows how ast-grep interprets your search pattern.

- `ast_grep_test_match_code_rule`
  - Use to test a YAML rule against example code before searching the repo.

- `ast_grep_find_code`
  - Use for simple single-pattern searches when one AST pattern is enough.

- `ast_grep_find_code_by_rule`
  - Use for complex searches that need relational rules like `has`, `inside`, `precedes`, `follows`, or composite rules like `all`, `any`, `not`.

Unavailable here:
- `ast_grep_rewrite_code`
- `ast_grep_scan-code`
- `ast_grep_analyze-imports`

Alternates:
- Use `ast_grep_find_code` or `ast_grep_find_code_by_rule` to verify structural candidates before editing.
- Use LSP diagnostics and project lint/typecheck/build/test commands for broad quality checks.
- Use `cymbal`, `grep`, and `read` for import discovery and narrow local inspection.

## Default workflow

### 1. Clarify the target shape

Decide:
- which language is involved
- what should match
- what must be excluded
- whether a simple pattern is enough or a YAML rule is needed

### 2. Create a minimal example

Write a tiny code sample that should match. If exclusions matter, write one sample that should not match too.

### 3. Inspect syntax when uncertain

Use `ast_grep_dump_syntax_tree` on:
- the target code with `format: cst` or `format: ast`
- the candidate pattern with `format: pattern`

Do this when you are unsure about node kinds, nesting, or how metavariables are interpreted.

### 4. Start simple

- Use a plain pattern first when the shape is simple.
- Move to a YAML rule when you need context, ordering, exclusions, or relational logic.

Useful defaults:
- Use `pattern` for direct shape matches.
- Use `kind` plus relational rules for more complex structure.
- Use `all`, `any`, and `not` when combining conditions.
- For relational rules like `has` and `inside`, default to `stopBy: end` unless you need a tighter stop condition.

### 5. Test before repo-wide search

Use `ast_grep_test_match_code_rule` to validate a YAML rule against the minimal example.

If the rule fails:
- simplify it
- inspect the syntax tree again
- confirm the node kinds
- confirm metavariable placement

### 6. Search the repo

- Use `ast_grep_find_code` for straightforward pattern searches.
- Use `ast_grep_find_code_by_rule` for relational or composite logic.

Prefer the narrowest project path and language that answers the question.

## Heuristics

- If text search would return many false positives, use ast-grep.
- If the match depends on syntax context, use a YAML rule.
- If the question is "how is this symbol connected?", use `cymbal` first.
- If you already know the exact file and just need lines for editing, use `read`.

## Example progression

### Simple pattern

Goal: find `console.log(...)` calls in JavaScript.

- Start with `ast_grep_find_code`
- Pattern: `console.log($ARG)`

### Structural rule

Goal: find async functions that use `await`.

- Inspect a small example if needed.
- Test a YAML rule with `ast_grep_test_match_code_rule`.
- Then search with `ast_grep_find_code_by_rule`.

Example rule:

```yaml
id: async-with-await
language: javascript
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end
```

### Exclusion rule

Goal: find async functions with `await` but without `try/catch`.

Use a composite rule with `all` and `not`.

## References

- `references/rule_reference.md` contains the detailed ast-grep rule syntax.

Use the reference when you need exact YAML syntax for:
- atomic rules
- relational rules
- composite rules
- metavariables
