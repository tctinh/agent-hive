# Releasing Agent Hive

This repo publishes:

- `opencode-hive` to npm (GitHub Actions `Release` workflow)
- `vscode-hive` to the VS Code Marketplace (same workflow)

The `Release` workflow publishes **only on tags** matching `v*`; tagged releases only. Manual runs (`workflow_dispatch`) are rehearsal runs: they build and test the release candidate without publishing anything.

## 1) Prep the release locally

Pick a version (for example `1.3.5`) and run:

```bash
bun run release:prepare -- 1.3.5
```

This will:

- Bump versions in `package.json` + workspace packages
- Generate `docs/releases/v1.3.5.md` (draft release notes)
- Create/update `CHANGELOG.md`

Review/edit the generated notes and changelog before continuing.

## 2) Validate

Install dependencies and run the release validation flow:

```bash
bun install
bun run build
bun run release:check
```

`bun run release:check` is the pre-release safety net. It performs the repo install/build/test flow used for release preparation. If it fails, fix the branch before opening the release PR.

## 3) Rehearse the GitHub workflow with `workflow_dispatch`

Before tagging, run the `Release` GitHub Actions workflow manually from the release branch or the merge commit you expect to tag.

Use this rehearsal to confirm:

- the workflow still boots on the current branch
- build and test steps pass in CI
- generated release artifacts look correct
- no publish step runs during the manual rehearsal

## 4) Merge to `main`

Open a PR with:

- Version bumps
- `CHANGELOG.md` updates
- `docs/releases/vX.Y.Z.md` release notes

Merge only after local validation and the `workflow_dispatch` rehearsal both pass.

## 5) Tag and release

After merging to `main`, create and push a tag:

```bash
git checkout main
git pull
git tag -a v1.3.5 -m "Release 1.3.5"
git push origin v1.3.5
```

That tag triggers `.github/workflows/release.yml` to build, publish, and create the GitHub Release.
