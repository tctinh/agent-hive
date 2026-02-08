---
name: docker-mastery
description: "Use when working with Docker containers — debugging container failures, writing Dockerfiles, docker-compose for integration tests, image optimization, or deploying containerized applications"
---

# Docker Mastery

## Overview

Docker is a **platform for building, shipping, and running applications**, not just isolation.

Agents should think in containers: reproducible environments, declarative dependencies, isolated execution.

**Core principle:** Containers are not virtual machines. They share the kernel but isolate processes, filesystems, and networks.

**Violating the letter of these guidelines is violating the spirit of containerization.**

## The Iron Law

```
UNDERSTAND THE CONTAINER BEFORE DEBUGGING INSIDE IT
```

Before exec'ing into a container or adding debug commands:
1. Check the image (what's installed?)
2. Check mounts (what host files are visible?)
3. Check environment variables (what config is passed?)
4. Check the Dockerfile (how was it built?)

Random debugging inside containers wastes time. Context first, then debug.

## When to Use

Use this skill when working with:
- **Container build failures** - Dockerfile errors, missing dependencies
- **Test environment setup** - Reproducible test environments across machines
- **Integration test orchestration** - Multi-service setups (DB + API + tests)
- **Dockerfile authoring** - Writing efficient, maintainable Dockerfiles
- **Image size optimization** - Reducing image size, layer caching
- **Deployment** - Containerized application deployment
- **Sandbox debugging** - Issues with Hive's Docker sandbox mode

**Use this ESPECIALLY when:**
- Tests pass locally but fail in CI (environment mismatch)
- "Works on my machine" problems
- Need to test against specific dependency versions
- Multiple services must coordinate (database + API)
- Building for production deployment

## Core Concepts

### Images vs Containers

- **Image**: Read-only template (built from Dockerfile)
- **Container**: Running instance of an image (ephemeral by default)

```bash
# Build once
docker build -t myapp:latest .

# Run many times
docker run --rm myapp:latest
docker run --rm -e DEBUG=true myapp:latest
```

**Key insight:** Changes inside containers are lost unless committed or volumes are used.

### Volumes & Mounts

Mount host directories into containers for persistence and code sharing:

```bash
# Mount current directory to /app in container
docker run -v $(pwd):/app myapp:latest

# Hive worktrees are mounted automatically
# Your code edits (via Read/Write/Edit tools) affect the host
# Container sees the same files at runtime
```

**How Hive uses this:** Worktree is mounted into container, so file tools work on host, bash commands run in container.

### Multi-Stage Builds

Minimize image size by using multiple FROM statements:

```dockerfile
# Build stage (large, has compilers)
FROM node:22 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

# Runtime stage (small, production only)
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

**Result:** Builder tools (TypeScript, bundlers) not included in final image.

### Docker Compose for Multi-Service Setups

Define multiple services in `docker-compose.yml`:

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: testpass
    ports:
      - "5432:5432"
  
  api:
    build: .
    environment:
      DATABASE_URL: postgres://db:5432/testdb
    depends_on:
      - db
    ports:
      - "3000:3000"
```

Run with: `docker-compose up -d`
Teardown with: `docker-compose down`

### Network Modes

- **bridge** (default): Isolated network, containers can talk to each other by name
- **host**: Container uses host's network directly (no isolation)
- **none**: No network access

**When to use host mode:** Debugging network issues, accessing host services directly.

## Common Patterns

### Debug a Failing Container

**Problem:** Container exits immediately, logs unclear.

**Pattern:**
1. Run interactively with shell:
   ```bash
   docker run -it --entrypoint sh myapp:latest
   ```
2. Inspect filesystem, check if dependencies exist:
   ```bash
   ls /app
   which node
   cat /etc/os-release
   ```
3. Run command manually to see full error:
   ```bash
   node dist/index.js
   ```

### Integration Tests with Docker Compose

**Pattern:**
1. Define services in `docker-compose.test.yml`
2. Add wait logic (wait for DB to be ready)
3. Run tests
4. Teardown

```yaml
# docker-compose.test.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: test
  test:
    build: .
    command: bun run test:integration
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://postgres:test@db:5432/testdb
```

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
docker-compose -f docker-compose.test.yml down
```

### Optimize Dockerfile

**Anti-pattern:**
```dockerfile
FROM node:22
WORKDIR /app
COPY . .              # Copies everything (including node_modules, .git)
RUN bun install       # Invalidates cache on any file change
CMD ["bun", "run", "start"]
```

**Optimized:**
```dockerfile
FROM node:22-slim     # Use slim variant
WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json bun.lockb ./
RUN bun install --production

# Copy source code (changes frequently)
COPY src ./src
COPY tsconfig.json ./

CMD ["bun", "run", "start"]
```

**Add `.dockerignore`:**
```
node_modules
.git
.env
*.log
dist
.DS_Store
```

### Handle Missing Dependencies

**Problem:** Command fails with "not found" in container.

**Pattern:**
1. Check if dependency is in image:
   ```bash
   docker run -it myapp:latest which git
   ```
2. If missing, add to Dockerfile:
   ```dockerfile
   RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
   ```
3. Or use a richer base image (e.g., `node:22` instead of `node:22-slim`).

## Hive Sandbox Integration

### How Hive Wraps Commands

When sandbox mode is active (`sandbox: 'docker'` in config):
1. Hive hook intercepts bash commands before execution
2. Wraps with `docker run --rm -v <worktree>:/workspace -w /workspace <image> sh -c "<command>"`
3. Command runs in container, but file edits (Read/Write/Edit) still affect host

**Workers are unaware** — they issue normal bash commands, Hive handles containerization.

### When Host Access is Needed

Some operations MUST run on host:
- **Git operations** (commit, push, branch) — repo state is on host
- **Host-level tools** (Docker itself, system config)
- **Cross-worktree operations** (accessing main repo from worktree)

**Pattern:** Use `HOST:` prefix to escape sandbox:
```bash
HOST: git status
HOST: docker ps
```

**If you need host access frequently:** Report as blocked and ask user if sandbox should be disabled for this task.

### Persistent vs Ephemeral Containers

**Current (v1.2.0):** Each command runs `docker run --rm` (ephemeral). State does NOT persist.

Example: `npm install lodash` in one command → not available in next command.

**Workaround:** Install dependencies in Dockerfile, not at runtime.

**Future:** `docker exec` will reuse containers, persisting state across commands.

### Auto-Detected Images

Hive detects runtime from project files:
- `package.json` → `node:22-slim`
- `requirements.txt` / `pyproject.toml` → `python:3.12-slim`
- `go.mod` → `golang:1.22-slim`
- `Cargo.toml` → `rust:1.77-slim`
- `Dockerfile` → Builds from project Dockerfile
- Fallback → `ubuntu:24.04`

**Override:** Set `dockerImage` in config (`~/.config/opencode/agent_hive.json`).

## Red Flags - STOP

If you catch yourself:
- Installing packages on host instead of in Dockerfile
- Running `docker build` without `.dockerignore` (cache invalidation)
- Using `latest` tag in production (non-reproducible)
- Ignoring container exit codes (hides failures)
- Assuming state persists between `docker run --rm` commands
- Using absolute host paths in Dockerfile (not portable)
- Copying secrets into image layers (leaks credentials)

**ALL of these mean: STOP. Review pattern.**

## Anti-Patterns

| Excuse | Reality |
|--------|---------|
| "I'll just run it on host" | Container mismatch bugs are worse to debug later. Build happens in container anyway. |
| "Works in my container, don't need CI" | CI uses different cache state. Always test in CI-like environment. |
| "I'll optimize the Dockerfile later" | Later never comes. Large images slow down deployments now. |
| "latest tag is fine for dev" | Dev should match prod. Pin versions or face surprises. |
| "Don't need .dockerignore, COPY is fast" | Invalidates cache on every file change. Wastes minutes per build. |
| "Install at runtime, not in image" | Ephemeral containers lose state. Slows down every command. |
| "Skip depends_on, services start fast" | Race conditions in integration tests. Use wait-for-it or health checks. |

## Verification Before Completion

Before marking Docker work complete:

- [ ] Container runs successfully: `docker run --rm <image> <command>` exits 0
- [ ] Tests pass inside container (not just on host)
- [ ] No host pollution (dependencies installed in container, not host)
- [ ] `.dockerignore` exists if using `COPY . .`
- [ ] Image tags are pinned (not `latest`) for production
- [ ] Multi-stage build used if applicable (separate build/runtime)
- [ ] Integration tests teardown properly (`docker-compose down`)

**If any fail:** Don't claim success. Fix or report blocker.

## Quick Reference

| Task | Command Pattern |
|------|----------------|
| **Debug container** | `docker run -it --entrypoint sh <image>` |
| **Run with mounts** | `docker run -v $(pwd):/app <image>` |
| **Multi-service tests** | `docker-compose up --abort-on-container-exit` |
| **Check image contents** | `docker run --rm <image> ls /app` |
| **Optimize build** | Add `.dockerignore`, use multi-stage, pin versions |
| **Escape Hive sandbox** | Prefix with `HOST:` (e.g., `HOST: git status`) |

## Related Skills

- **hive_skill:systematic-debugging** - When container behavior is unexpected
- **hive_skill:test-driven-development** - Write tests that run in containers
- **hive_skill:verification-before-completion** - Verify tests pass in container before claiming done
