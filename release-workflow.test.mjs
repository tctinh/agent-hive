import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

async function loadNpmPublishAccessHelper() {
  const helperPath = path.join(workspaceRoot, '.github', 'scripts', 'verify-npm-publish-access.mjs');

  if (!fs.existsSync(helperPath)) {
    return null;
  }

  return import(pathToFileURL(helperPath).href);
}

describe('release workflow recovery contract', () => {
  it('adds workflow_dispatch rehearsal defaults plus explicit tag-only recovery inputs', () => {
    const workflow = readText('.github/workflows/release.yml');

    assert.match(workflow, /workflow_dispatch:\s+inputs:/s);
    assert.match(workflow, /release_mode:\s+[\s\S]*default:\s*rehearse/s);
    assert.match(workflow, /recovery_tag:\s+[\s\S]*description:\s*['"]Existing v\* tag to recover['"]/s);
    assert.match(workflow, /recover_npm:\s+[\s\S]*default:\s*false/s);
    assert.match(workflow, /recover_vscode:\s+[\s\S]*default:\s*false/s);
    assert.match(workflow, /recover_github_release:\s+[\s\S]*default:\s*false/s);
  });

  it('fails fast for invalid recovery submissions before the build starts', () => {
    const workflow = readText('.github/workflows/release.yml');

    assert.match(workflow, /prepare:/);
    assert.match(workflow, /requested recovery tag must start with v/i);
    assert.match(workflow, /No recovery targets were selected/i);
    assert.match(workflow, /git ls-remote --exit-code --refs --tags "https:\/\/github\.com\/\$\{GITHUB_REPOSITORY\}\.git" "refs\/tags\/\$\{requested_tag\}"/);
    assert.match(workflow, /build:\s+[\s\S]*needs:\s*prepare/s);
  });

  it('computes the effective checkout ref and resolved release tag for downstream jobs', () => {
    const workflow = readText('.github/workflows/release.yml');

    assert.match(workflow, /outputs:\s+[\s\S]*checkout_ref:/s);
    assert.match(workflow, /outputs:\s+[\s\S]*release_tag:/s);
    assert.match(workflow, /ref:\s*\$\{\{ needs\.prepare\.outputs\.checkout_ref \}\}/);
    assert.match(workflow, /fetch-depth:\s*0/);
    assert.match(workflow, /fetch-tags:\s*true/);
    assert.match(workflow, /name:\s*release-notes/);
    assert.match(workflow, /docs\/releases\/\$\{\{ needs\.prepare\.outputs\.release_tag \}\}\.md/);
  });

  it('keeps release skip-tolerant and protects the workflow contract from release:check', () => {
    const workflow = readText('.github/workflows/release.yml');
    const packageJson = readJson('package.json');

    assert.match(workflow, /release:\s+[\s\S]*needs:\s*\[prepare, build, publish-npm, publish-vscode\]/s);
    assert.match(workflow, /needs\.build\.result == 'success'/);
    assert.match(workflow, /needs\.prepare\.outputs\.publish_npm == 'true' && needs\.publish-npm\.result == 'success'\)\s*\|\|\s*\(needs\.prepare\.outputs\.publish_npm != 'true' && needs\.publish-npm\.result == 'skipped'\)/);
    assert.match(workflow, /needs\.prepare\.outputs\.publish_vscode == 'true' && needs\.publish-vscode\.result == 'success'\)\s*\|\|\s*\(needs\.prepare\.outputs\.publish_vscode != 'true' && needs\.publish-vscode\.result == 'skipped'\)/);
    assert.match(workflow, /tag_name:\s*\$\{\{ needs\.prepare\.outputs\.release_tag \}\}/);
    assert.match(packageJson.scripts['release:check'], /node --test release-workflow\.test\.mjs/);
  });
});

describe('npm publish access helper', () => {
  it('accepts read-write collaborator access', async () => {
    const helperModule = await loadNpmPublishAccessHelper();

    assert.ok(helperModule, 'expected .github/scripts/verify-npm-publish-access.mjs to exist');
    assert.equal(
      helperModule.validateNpmPublishAccess({
        npmUser: 'release-bot',
        collaborators: {
          'release-bot': 'read-write',
        },
      }),
      'read-write'
    );
  });

  it('rejects missing collaborator entries', async () => {
    const helperModule = await loadNpmPublishAccessHelper();

    assert.ok(helperModule, 'expected .github/scripts/verify-npm-publish-access.mjs to exist');
    assert.throws(
      () =>
        helperModule.validateNpmPublishAccess({
          npmUser: 'release-bot',
          collaborators: {},
        }),
      /npm user release-bot is not listed as a collaborator on opencode-hive/
    );
  });

  it('rejects weaker-than-read-write collaborator access', async () => {
    const helperModule = await loadNpmPublishAccessHelper();

    assert.ok(helperModule, 'expected .github/scripts/verify-npm-publish-access.mjs to exist');
    assert.throws(
      () =>
        helperModule.validateNpmPublishAccess({
          npmUser: 'release-bot',
          collaborators: {
            'release-bot': 'read-only',
          },
        }),
      /npm user release-bot has read-only access to opencode-hive; expected read-write/
    );
  });

  it('uses the checked-in helper script from the workflow instead of inline node-e JavaScript', () => {
    const workflow = readText('.github/workflows/release.yml');

    assert.match(workflow, /node \.github\/scripts\/verify-npm-publish-access\.mjs/);
    assert.doesNotMatch(workflow, /node -e/);
  });
});

describe('release recovery docs contract', () => {
  it('documents rehearsal defaults, tag-only recovery, and operator-selected recovery targets', () => {
    const releasing = readText('docs/RELEASING.md');
    const agents = readText('AGENTS.md');

    assert.match(releasing, /workflow_dispatch/);
    assert.match(releasing, /manual runs default to .*rehearse/i);
    assert.match(releasing, /Recovery mode is only for existing .*vX\.Y\.Z.* tags/i);
    assert.match(releasing, /requires a recovery tag and at least one explicit target toggle/i);
    assert.match(releasing, /rerun only the unfinished targets/i);
    assert.match(releasing, /npm, VS Code, and\/or GitHub Release as needed/i);
    assert.match(releasing, /release-only recovery remains possible even when npm and VS Code were intentionally skipped/i);
    assert.match(agents, /manual selective recovery exists after a tagged release partially fails/i);
  });
});
