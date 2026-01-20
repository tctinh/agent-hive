# Releasing Agent Hive

This repo publishes:

- `opencode-hive` to npm (GitHub Actions `Release` workflow)
- `vscode-hive` to the VS Code Marketplace (same workflow)

The `Release` workflow runs **publishing only on tags** matching `v*`. Manual runs (`workflow_dispatch`) build and test only.

## 1) Prep the release locally

Pick a version (e.g. `0.8.3`) and run:

```bash
npm run release:prepare -- 0.8.3
```

This will:

- Bump versions in `package.json` + workspace packages
- Generate `docs/releases/v0.8.3.md` (draft release notes)
- Create/update `CHANGELOG.md`

Review/edit the generated notes and changelog before continuing.

## 2) Validate

Run the normal build/test loop:

```bash
bun install
npm run build --workspaces
npm -ws --if-present run test
```

## 3) Merge to `main`

Open a PR with:

- Version bumps
- `CHANGELOG.md` updates
- `docs/releases/vX.Y.Z.md` release notes

## 4) Tag and release

After merging to `main`, create and push a tag:

```bash
git checkout main
git pull
git tag -a v0.8.3 -m "Release 0.8.3"
git push origin v0.8.3
```

That tag triggers `.github/workflows/release.yml` to build, publish, and create a GitHub Release.
