# Releasing Agent Hive

This repo publishes:

- `opencode-hive` to npm (GitHub Actions `Release` workflow)
- `vscode-hive` to the VS Code Marketplace (same workflow)

The `Release` workflow runs **publishing only on tags** matching `v*`. Manual runs (`workflow_dispatch`) build and test only.

## 1) Prep the release locally

For the current patch line, work from `release/human-overview-context-v1`, pick a version (e.g. `1.3.4`), and run:

```bash
git checkout release/human-overview-context-v1
git pull
bun run release:prepare -- 1.3.4
```

This will:

- Bump versions in `package.json` + workspace packages
- Generate `docs/releases/v1.3.4.md` (draft release notes)
- Create/update `CHANGELOG.md`

Review/edit the generated notes and changelog before continuing.

Manual `workflow_dispatch` runs of `release.yml` are branch-safe rehearsal runs: they build and test the selected ref, but they do not publish packages.

## 2) Validate

Run the normal build/test loop:

```bash
bun install
bun run build
bun run --filter hive-core test
bun run --filter opencode-hive test
bun run --filter vscode-hive test
bun test release-artifacts.test.mjs
```

Or use the combined helper:

```bash
bun run release:check
```

## 3) Merge to the release branch

Open a PR with:

- Version bumps
- `CHANGELOG.md` updates
- `docs/releases/vX.Y.Z.md` release notes

Target `release/human-overview-context-v1` for the active `1.3.x` line. Do not switch this patch workflow back to `main`.

## 4) Tag and release

After merging to `release/human-overview-context-v1`, create and push a tag:

```bash
git checkout release/human-overview-context-v1
git pull
gh workflow run release.yml --ref release/human-overview-context-v1
git tag -a v1.3.4 -m "Release v1.3.4"
git push origin v1.3.4
```

The manual workflow run rehearses the exact release branch without publishing. The pushed tag then triggers `.github/workflows/release.yml` to build, publish, and create a GitHub Release.
