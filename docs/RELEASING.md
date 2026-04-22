# Releasing Agent Hive

This repo publishes:

- `opencode-hive` to npm (GitHub Actions `Release` workflow)
- `hive-mcp` to npm (same workflow)
- `claude-code-hive` to npm (same workflow)
- `vscode-hive` to the VS Code Marketplace (same workflow)

The `Release` workflow publishes **only on tags** matching `v*`. Under `workflow_dispatch`, manual runs default to `rehearse`: they build and test the candidate without publishing to npm, the VS Code Marketplace, or GitHub Releases. Recovery mode is only for existing `vX.Y.Z` tags and reuses that tagged commit.

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
node .github/scripts/verify-npm-publish-access.mjs opencode-hive hive-mcp claude-code-hive
npx @vscode/vsce verify-pat tctinh
bun run release:check
```

Treat these as preflight checks, not preparation shortcuts:

- `npm whoami` confirms the npm token is valid
- `node .github/scripts/verify-npm-publish-access.mjs opencode-hive hive-mcp claude-code-hive` confirms the publishing account still has collaborator access to already-published npm packages and treats a package that does not exist yet as a first publish
- `npx @vscode/vsce verify-pat tctinh` confirms the Marketplace PAT is still valid for the publisher account
- `bun run release:check` is the repo safety net for artifacts, builds, and tests

If any preflight fails, fix credentials/access or branch content before opening the release PR or creating a tag.

For `claude-code-hive`, the first tagged publish may be the package's first publish on npm. In that case, the helper should report that the package is currently absent and allow the release path to continue as a first publish, rather than requiring existing collaborator metadata up front.

## 3) Rehearse the GitHub workflow with `workflow_dispatch`

Before tagging, run the `Release` GitHub Actions workflow manually with `workflow_dispatch` from the release branch or the merge commit you expect to tag.

Use this rehearsal to confirm:

- the workflow still boots on the current branch
- build and test steps pass in CI
- generated release artifacts look correct
- no publish step runs during the manual rehearsal

Manual runs default to the `rehearse` mode, so this path is for build/test confidence only. The real npm publish, VS Code Marketplace publish, and GitHub Release creation happen only from a pushed `vX.Y.Z` tag or from a later tag-backed recovery run.

If a tagged release partially fails later, rerun the same workflow with `release_mode=recover`. Recovery requires a recovery tag and at least one explicit target toggle, and it only accepts an existing `vX.Y.Z` tag. Do not use recovery from a branch or arbitrary commit SHA.

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

### Publish order

Publish order guidance: `opencode-hive`, `hive-mcp`, `claude-code-hive`, and VS Code Marketplace are all part of the tagged release flow, but the only enforced package dependency is that `hive-mcp` must publish before `claude-code-hive`; `opencode-hive` and VS Code Marketplace can publish independently after the build, and GitHub Release waits for the selected publish targets.

`claude-code-hive` is intentionally published after `hive-mcp` because the Claude plugin package depends on the MCP runtime package. Recovery runs are package-specific, so rerun only the unfinished target or targets instead of replaying the whole npm sequence.

## Missed-release recovery

When a tag already exists but one or more release targets failed, recover by manually dispatching the `Release` workflow in `recover` mode for that existing tag.

### Recovery contract

- Recovery is tag-only: set `release_mode=recover` and provide an existing `recovery_tag` such as `v1.4.2`.
- Recovery requires a recovery tag and at least one explicit target toggle.
- Recovery toggles are operator-selected, not automatic: enable only `recover_opencode_hive`, `recover_hive_mcp`, `recover_claude_code_hive`, `recover_vscode`, and/or `recover_github_release` for the unfinished targets.
- Rerun only the unfinished targets. If npm already published but the VS Code Marketplace step failed, rerun only `recover_vscode`. If both publishes succeeded but the GitHub Release was skipped or failed, run release-only recovery.

### Operator flow for a partially published version

1. Check which targets actually finished for the tagged version.
2. Repair the credentials or access issue that caused the partial failure.
3. Open the `Release` workflow with `workflow_dispatch`.
4. Set `release_mode` to `recover`.
5. Set `recovery_tag` to the existing release tag.
6. Enable only the unfinished targets: opencode-hive, hive-mcp, claude-code-hive, VS Code, and/or GitHub Release as needed.
7. Run the workflow and verify only the selected targets executed.

Release-only recovery remains possible even when npm and VS Code were intentionally skipped. For example, if a previous recovery run published the registries successfully but left the GitHub Release missing, rerun with only `recover_github_release=true`.

Do not start the next patch release until the current tag is fully recovered from its tagged commit.
