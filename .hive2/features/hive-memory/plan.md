# Hive Memory: Feature-Scoped RAG

> Vision: Long-term memory for agents using LightRAG - file-based, local, per-feature
> Library: HKUDS/LightRAG (27k stars, MIT license)
> Pattern: Knowledge graph + vector retrieval, all stored as JSON files

## Overview

Agents lack persistent memory. Context windows fill up. Past decisions get forgotten.

**Hive Memory** solves this by giving each feature its own LightRAG instance:
- **Index** all context files, plans, specs, reports, conversation summaries
- **Query** semantically: "how do we handle auth errors?"
- **Retrieve** relevant chunks, not everything
- **Graph-aware**: understands entity relationships (JWT → auth → middleware)

### Why LightRAG?

| Feature | Benefit for Hive |
|---------|------------------|
| **File-based storage** | No database server, fits `.hive/` model |
| **Graph + Vector** | Understands relationships, not just similarity |
| **Local embeddings** | Ollama support, no API cost, privacy |
| **Small scale friendly** | Feature RAG is ~100 docs max |
| **Simple API** | `insert()`, `query()`, done |

---

## Architecture

### Storage Structure

```
.hive/features/<name>/
├── plan.md
├── context/
│   ├── decisions.md
│   └── patterns.md
├── tasks/
│   ├── 01-setup/
│   │   ├── spec.md
│   │   └── report.md
│   └── 02-implement/
├── sessions.json
└── memory/                    ← NEW: LightRAG storage
    ├── kv_store_full_docs.json
    ├── kv_store_text_chunks.json
    ├── kv_store_llm_response_cache.json
    ├── vdb_entities.json
    ├── vdb_relationships.json
    ├── vdb_chunks.json
    └── graph_chunk_entity_relation.graphml
```

**Each feature has isolated memory** - no cross-contamination.

### Indexing Pipeline

```
File Watcher detects change:
├── context/*.md
├── plan.md  
├── tasks/*/spec.md
├── tasks/*/report.md
└── sessions.json (summarized)
    │
    ▼
LightRAG.insert(content, metadata)
    │
    ▼
Stored in memory/ folder
```

### Query Flow

```
Agent calls hive_memory_search("how handle auth errors")
    │
    ▼
LightRAG.query(mode="hybrid")
    │
    ├── Vector search: find similar chunks
    ├── Graph search: find related entities
    └── Combine results
    │
    ▼
Return relevant context (5-10 chunks, ~2k tokens)
```

---

## Tasks

### Phase 1: Core Integration

#### 1. Add LightRAG as dependency

Add `lightrag-hku` to hive-core package.

**Note**: Use file-based storage only:
- `kv_storage="JsonKVStorage"`
- `vector_storage="NanoVectorDBStorage"` 
- `graph_storage="NetworkXStorage"`

**Files to modify:**
- `packages/hive-core/package.json` (if Node) or setup Python bridge
- Consider: LightRAG is Python, hive-core is TypeScript

**Options:**
1. Python subprocess for RAG operations
2. Embed Python via child_process with JSON IPC
3. Pure TypeScript RAG (harder, less mature)

**Recommendation**: Python subprocess with simple CLI interface.

#### 2. Create MemoryService in hive-core

```typescript
class MemoryService {
  async initialize(feature: string): Promise<void>
  async index(feature: string, documents: Document[]): Promise<void>
  async query(feature: string, query: string): Promise<MemoryResult[]>
  async reindex(feature: string): Promise<void>
}
```

**Files to create:**
- `packages/hive-core/src/services/memoryService.ts`
- `packages/hive-core/scripts/lightrag_bridge.py` (Python CLI)

#### 3. Implement file watcher for auto-indexing

Watch `.hive/features/<name>/` for changes:
- `context/*.md` changed → reindex
- `tasks/*/report.md` created → index new report
- `plan.md` changed → reindex

**Files to create:**
- `packages/hive-core/src/services/memoryWatcher.ts`

---

### Phase 2: Agent Tools

#### 4. Add hive_memory_search tool

```typescript
hive_memory_search: tool({
  description: 'Search feature memory for relevant context, decisions, and patterns',
  args: {
    query: z.string().describe('What to search for'),
    scope: z.enum(['current', 'all']).optional().describe('current feature or all'),
    mode: z.enum(['hybrid', 'local', 'global']).optional()
  },
  async execute({ query, scope, mode, feature }) {
    const results = await memoryService.query(feature, query, { mode });
    return formatResults(results);
  }
})
```

**Files to modify:**
- `packages/opencode-hive/src/index.ts`

#### 5. Add hive_remember tool

```typescript
hive_remember: tool({
  description: 'Save important insight or decision to long-term memory',
  args: {
    content: z.string().describe('What to remember'),
    tags: z.array(z.string()).optional()
  },
  async execute({ content, tags, feature }) {
    // Writes to context file AND indexes immediately
    const key = generateKey(content);
    await contextService.write(feature, `memory-${key}`, content);
    await memoryService.indexNow(feature, content, tags);
    return `Remembered: ${content.slice(0, 50)}...`;
  }
})
```

**Files to modify:**
- `packages/opencode-hive/src/index.ts`

---

### Phase 3: Enhanced Session Open

#### 6. Integrate memory into hive_session_open

When agent opens session, include relevant memory:

```typescript
hive_session_open: async ({ feature, task }) => {
  // ... existing code ...
  
  // NEW: Query memory for task-relevant context
  if (task) {
    const taskSpec = await taskService.getSpec(feature, task);
    const relevantMemory = await memoryService.query(
      feature, 
      taskSpec.description,
      { topK: 3 }
    );
    response += formatMemoryContext(relevantMemory);
  }
  
  return response;
}
```

**Files to modify:**
- `packages/opencode-hive/src/index.ts`

---

### Phase 4: Cross-Feature Memory (Optional)

#### 7. Add global memory search

Allow searching across ALL features for patterns:

```typescript
hive_memory_search_global: tool({
  description: 'Search across all features for patterns and solutions',
  args: { query: z.string() },
  async execute({ query }) {
    const allFeatures = await featureService.list();
    const results = await Promise.all(
      allFeatures.map(f => memoryService.query(f.name, query, { topK: 2 }))
    );
    return formatGlobalResults(results);
  }
})
```

---

### Phase 5: Conversation Summarization

#### 8. Summarize and index session conversations

At session end, summarize conversation and index:

```
Session ends (hive_exec_complete or session timeout)
    │
    ▼
Summarize conversation (LLM call):
"Discussed JWT implementation, decided on jose library,
 handled refresh tokens with sliding window..."
    │
    ▼
Index summary in memory
    │
    ▼
Next session can retrieve: "what did we decide about JWT?"
```

**Files to create:**
- `packages/hive-core/src/services/sessionSummarizer.ts`

---

## LightRAG Configuration

```python
from lightrag import LightRAG

def create_feature_rag(feature_path: str) -> LightRAG:
    memory_dir = f"{feature_path}/memory"
    
    return LightRAG(
        working_dir=memory_dir,
        
        # File-based storage (no external DB)
        kv_storage="JsonKVStorage",
        vector_storage="NanoVectorDBStorage",
        graph_storage="NetworkXStorage",
        
        # Local embeddings (no API cost)
        embedding_func=ollama_embed,  # or local model
        
        # LLM for entity extraction (one-time at index)
        llm_model_func=ollama_complete,
        
        # Small chunks for context precision
        chunk_token_size=500,
        chunk_overlap_token_size=50,
    )
```

---

## Success Criteria

### Core Memory
- [ ] LightRAG integrated as Python subprocess
- [ ] Each feature has isolated `memory/` folder
- [ ] File watcher auto-indexes on content changes
- [ ] `hive_memory_search` returns relevant context

### Agent Tools
- [ ] `hive_memory_search(query)` works from agent
- [ ] `hive_remember(content)` persists insights
- [ ] `hive_session_open` includes relevant memory

### Quality
- [ ] Query "how handle auth" returns auth-related decisions
- [ ] Graph traversal: "JWT" → "authentication" → "middleware"
- [ ] No API calls required (local embeddings)

---

## Technical Decisions

### Why Python Subprocess?

| Option | Pros | Cons |
|--------|------|------|
| **Python subprocess** | Use LightRAG directly, mature | Cross-language IPC |
| **WASM** | Single language | LightRAG not available |
| **Pure TS** | No Python | Immature libraries |
| **HTTP server** | Clean API | Extra process to manage |

**Decision**: Python subprocess with JSON IPC. Simple, reliable.

```typescript
// TypeScript side
const result = await execPython(
  'lightrag_bridge.py',
  ['query', '--feature', feature, '--query', query]
);
return JSON.parse(result);
```

```python
# Python side (lightrag_bridge.py)
import sys, json
from lightrag import LightRAG

def main():
    cmd = sys.argv[1]
    if cmd == 'query':
        feature = sys.argv[3]
        query = sys.argv[5]
        rag = create_feature_rag(feature)
        result = rag.query(query, mode="hybrid")
        print(json.dumps({"results": result}))

if __name__ == "__main__":
    main()
```

### Why Per-Feature RAG?

1. **Isolation**: Feature A's memory doesn't pollute Feature B
2. **Deletion**: Delete feature = delete memory (clean)
3. **Scale**: Each RAG is small (~100 docs)
4. **Performance**: Fast queries on small corpus

---

## Out of Scope (Future)

- Cross-project memory (learning from multiple repos)
- Real-time memory streaming
- Memory visualization in panel
- Memory pruning/garbage collection
- Team-shared memory

---

## Dependencies

| Package | Purpose | 
|---------|---------|
| `lightrag-hku` | Core RAG library (Python) |
| `ollama` | Local embeddings + LLM |
| `nano-vectordb` | Local vector storage |
| `networkx` | Graph storage |
