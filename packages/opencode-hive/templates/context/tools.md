# Available Research Tools

Reference for Forager and Scout Bees on available MCP tools.

## Code Search

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `grep_app_searchGitHub` | GitHub code search | Find real-world examples, patterns in OSS |
| `ast_grep_search` | AST pattern matching | Find code structures, refactoring targets |
| `ast_grep_replace` | AST refactoring | Safe code transformations (use dryRun=true first) |

### grep_app Examples
```
grep_app_searchGitHub({ query: "useEffect cleanup", language: ["TypeScript"] })
grep_app_searchGitHub({ query: "(?s)try {.*await", useRegexp: true })
```

### ast_grep Examples
```
ast_grep_search({ pattern: "console.log($MSG)", lang: "typescript" })
ast_grep_replace({ pattern: "console.log($MSG)", rewrite: "logger.info($MSG)", lang: "typescript", dryRun: true })
```

## Documentation

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `context7_resolve-library-id` | Find library ID | Before querying docs |
| `context7_query-docs` | Query library docs | API usage, best practices |

### context7 Flow
1. `context7_resolve-library-id({ query: "how to use X", libraryName: "react" })`
2. Get libraryId from result (e.g., `/facebook/react`)
3. `context7_query-docs({ libraryId: "/facebook/react", query: "useEffect cleanup" })`

## Web Search

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `websearch_web_search_exa` | Exa AI search | Current info, recent developments |

### websearch Examples
```
websearch_web_search_exa({ query: "Next.js 15 new features 2026", numResults: 5 })
```

## Delegation

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `task` | Spawn subagent | Delegate to Scout for research |

### Delegation Example
```
task({ 
  subagent_type: "scout", 
  prompt: "Find all API routes in src/ and summarize patterns",
  description: "Explore API patterns"
})
```

---

## Tool Selection Guide

| Need | Best Tool |
|------|-----------|
| Find code in THIS repo | `grep`, `glob`, `ast_grep_search` |
| Find code in OTHER repos | `grep_app_searchGitHub` |
| Understand a library | `context7_query-docs` |
| Current events/info | `websearch_web_search_exa` |
| Structural refactoring | `ast_grep_replace` |
