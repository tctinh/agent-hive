# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2026-01-27

### Added
- `agentMode` and `delegateMode` configuration for unified or dedicated agent orchestration.
- Gated agent registration based on `agentMode`.

### Changed
- Improved package-wide build scripts and build order using `bun --filter`.
- Updated default configuration generation and accessors.

### Fixed
- Resolved issues with `opencode.json` registration in unified mode.

## [1.0.1] - 2026-01-27

### Added
- Parallel exploration skill with default auto-load for planner agents.
- Per-agent model variant configuration in opencode-hive.
- Selective disable support for skills and MCPs.

### Changed
- Background task timeout guidance and defaults (30–120s guidance, 60s default).
- Delegation/planning tuning and worker prompt de-dup + prompt file delegation.

### Tests & Docs
- Stabilized runtime smoke tests and auto-load skill coverage.
- Documented per-agent variant configuration.

## [0.8.3] - 2026-01-20

- See the GitHub release/tag `v0.8.3` for details.


## [0.8.2] - 2026-01-11

- See the GitHub release/tag `v0.8.2` for details.
