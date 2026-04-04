# Releasing Agent Hive

This repo publishes:

- `opencode-hive` to npm (GitHub Actions `Release` workflow)
- `vscode-hive` to the VS Code Marketplace (same workflow)

The `Release` workflow publishes **only on tags** matching `v*`; tagged releases only. Manual runs (`workflow_dispatch`) are rehearsal runs: they build and test the release candidate without publishing anything.

## 1) Prep the release locally

For `1.3.6`, release preparation is manual. Do not rely on the old release-prep helper; it is not part of the real release flow.

Update the release branch explicitly:

- bump the root and workspace package versions to `1.3.6`
- refresh tracked workspace lockfiles so their version markers also read `1.3.6`
- add `docs/releases/v1.3.6.md`
- add the `1.3.6` entry near the top of `CHANGELOG.md`
- update any operator-facing release/version docs that still mention the previous release contract

Review those edits before validation. The release workflow publishes `docs/releases/${github.ref_name}.md` as the GitHub Release body, so the matching release note file must exist before tagging.

## 2) Validate

Install dependencies and run the release validation flow locally:

```bash
bun install
bun run build
bun run release:check
```

`bun run release:check` is the pre-release safety net. Treat it as verification, not preparation. If any step fails, fix the branch before opening the release PR.

## 3) Rehearse the GitHub workflow with `workflow_dispatch`

Before tagging, run the `Release` GitHub Actions workflow manually with `workflow_dispatch` from the release branch or the merge commit you expect to tag.

Use this rehearsal to confirm:

- the workflow still boots on the current branch
- build and test steps pass in CI
- generated release artifacts look correct
- no publish step runs during the manual rehearsal

## 4) Merge to `main`

Open a PR with the manual `1.3.6` prep changes:

- version bumps
- lockfile refreshes
- `CHANGELOG.md` updates
- `docs/releases/v1.3.6.md` release notes

Merge only after local validation and the `workflow_dispatch` rehearsal both pass.

## 5) Tag and release

After merging to `main`, create and push the release tag:

```bash
git checkout main
git pull
git tag -a v1.3.6 -m "Release 1.3.6"
git push origin v1.3.6
```

That tag triggers `.github/workflows/release.yml` to build, publish, and create the GitHub Release.
