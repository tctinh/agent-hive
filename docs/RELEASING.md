# Releasing Agent Hive

This repo publishes:

- `opencode-hive` to npm (GitHub Actions `Release` workflow)
- `vscode-hive` to the VS Code Marketplace (same workflow)

The `Release` workflow publishes **only on tags** matching `v*`. Manual runs (`workflow_dispatch`) are rehearsal runs: they build and test the candidate without publishing to npm or the VS Code Marketplace.

## 1) Prep the release locally

Release preparation is manual. Do not rely on any old release-prep helper; it is not part of the real release flow.

Update the release branch explicitly for `vX.Y.Z`:

- bump the root and workspace package versions to `X.Y.Z`
- refresh tracked workspace lockfiles so their version markers also read `X.Y.Z`
- add `docs/releases/vX.Y.Z.md`
- add the `X.Y.Z` entry near the top of `CHANGELOG.md`
- update any operator-facing release/version docs that still mention the previous release contract

Review those edits before validation. The release workflow publishes `docs/releases/${github.ref_name}.md` as the GitHub Release body, so the matching release note file must exist before tagging.

## 2) Run local release preflight

Before tagging, confirm the operator credentials and package access that the tag-triggered publish jobs need:

```bash
npm whoami
npm access list collaborators opencode-hive --json
npx @vscode/vsce verify-pat tctinh
bun run release:check
```

Treat these as preflight checks, not preparation shortcuts:

- `npm whoami` confirms the npm token is valid
- `npm access list collaborators opencode-hive --json` confirms the publishing account still has collaborator access
- `npx @vscode/vsce verify-pat tctinh` confirms the Marketplace PAT is still valid for the publisher account
- `bun run release:check` is the repo safety net for artifacts, builds, and tests

If any preflight fails, fix credentials/access or branch content before opening the release PR or creating a tag.

## 3) Rehearse the GitHub workflow with `workflow_dispatch`

Before tagging, run the `Release` GitHub Actions workflow manually with `workflow_dispatch` from the release branch or the merge commit you expect to tag.

Use this rehearsal to confirm:

- the workflow still boots on the current branch
- build and test steps pass in CI
- generated release artifacts look correct
- no publish step runs during the manual rehearsal

Manual rehearsal is for build/test confidence only. The real npm publish, VS Code Marketplace publish, and GitHub Release creation happen only from a pushed `vX.Y.Z` tag.

## 4) Merge to `main`

Open a PR with the release prep changes:

- version bumps
- lockfile refreshes
- `CHANGELOG.md` updates
- `docs/releases/vX.Y.Z.md` release notes
- any release-contract documentation updates needed for the tagged release

Merge only after local preflight and the `workflow_dispatch` rehearsal both pass.

## 5) Tag and release

After merging to `main`, create and push the release tag:

```bash
git checkout main
git pull
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
```

That tag triggers `.github/workflows/release.yml` to build, publish, and create the GitHub Release.

## Missed-release recovery

When a tag already exists but the publish jobs failed, recover in two phases.

### Phase 1: Recover the missed tagged release

For the missed `1.4.0` release, use this operator flow:

1. Repair npm and VS Code credentials/access first.
2. Recover the missed `1.4.0` publish from the tagged commit by rerunning the normal tagged-release publish path for that existing tag context; do not invent force-publish or registry-mutation steps.

Do not start `1.4.1` prep until `1.4.0` is actually published from the tagged `v1.4.0` commit.

### Phase 2: Land hardening, then prepare the next patch

After `1.4.0` is recovered:

3. Land the repo hardening changes on `main`.
4. Prepare and tag `1.4.1` using the normal `vX.Y.Z` flow above.

This keeps the registries aligned with the historical tag first, then moves the repository forward with the credential checks, artifact-contract enforcement, and packaging fixes needed for future patch releases.
