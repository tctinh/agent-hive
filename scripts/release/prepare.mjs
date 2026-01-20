#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const version = args[0];

if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/release/prepare.mjs <version>");
  console.error("Example: node scripts/release/prepare.mjs 0.8.3");
  process.exit(1);
}

function sh(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  }).trim();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function bumpPackageJsonVersion(filePath, nextVersion) {
  const json = readJson(filePath);
  json.version = nextVersion;
  writeJson(filePath, json);
}

function getLastTag() {
  try {
    return sh("git", ["describe", "--tags", "--abbrev=0", "--match", "v*"]);
  } catch {
    return null;
  }
}

function getCommitsSince(ref) {
  const range = ref ? `${ref}..HEAD` : "HEAD";
  const out = sh("git", ["log", range, "--oneline"]);
  return out ? out.split("\n") : [];
}

function upsertChangelog(nextVersion, releaseDate) {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  const versionHeading = `## [${nextVersion}] - ${releaseDate}`;
  const linkLine = `- See the GitHub release/tag \`v${nextVersion}\` for details.`;

  if (!existsSync(changelogPath)) {
    const content =
      "# Changelog\n\n" +
      "All notable changes to this project will be documented in this file.\n\n" +
      "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\n" +
      "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n" +
      "## [Unreleased]\n\n" +
      `${versionHeading}\n\n` +
      `${linkLine}\n`;
    writeFileSync(changelogPath, content);
    return;
  }

  const current = readFileSync(changelogPath, "utf8");
  if (current.includes(versionHeading)) return;

  const unreleasedMarker = "## [Unreleased]";
  const idx = current.indexOf(unreleasedMarker);
  if (idx === -1) {
    const content =
      current.trimEnd() +
      `\n\n${unreleasedMarker}\n\n${versionHeading}\n\n${linkLine}\n`;
    writeFileSync(changelogPath, content);
    return;
  }

  const insertAt = idx + unreleasedMarker.length;
  const content =
    current.slice(0, insertAt) +
    `\n\n${versionHeading}\n\n${linkLine}\n` +
    current.slice(insertAt);
  writeFileSync(changelogPath, content);
}

function writeReleaseNotes(nextVersion, commits, lastTag) {
  const releasesDir = path.join(process.cwd(), "docs", "releases");
  mkdirSync(releasesDir, { recursive: true });

  const filePath = path.join(releasesDir, `v${nextVersion}.md`);
  const compareLine = lastTag
    ? `Compare: \`${lastTag}...v${nextVersion}\``
    : "Compare: (no previous tag found)";

  const commitLines =
    commits.length > 0 ? commits.map((c) => `- ${c}`).join("\n") : "- (no commits found)";

  const content =
    `# Release v${nextVersion}\n\n` +
    `${compareLine}\n\n` +
    "## Highlights\n\n" +
    "- (fill in)\n\n" +
    "## Changes\n\n" +
    `${commitLines}\n`;

  writeFileSync(filePath, content);
  return filePath;
}

const packageJsonPaths = [
  "package.json",
  "packages/hive-core/package.json",
  "packages/opencode-hive/package.json",
  "packages/vscode-hive/package.json",
].map((p) => path.join(process.cwd(), p));

for (const p of packageJsonPaths) bumpPackageJsonVersion(p, version);

const lastTag = getLastTag();
const commits = getCommitsSince(lastTag);

const releaseDate = new Date().toISOString().slice(0, 10);
upsertChangelog(version, releaseDate);
const notesPath = writeReleaseNotes(version, commits, lastTag);

process.stdout.write(
  [
    `Prepared release ${version}:`,
    `- Updated versions in: ${packageJsonPaths.map((p) => path.relative(process.cwd(), p)).join(", ")}`,
    `- Updated: CHANGELOG.md`,
    `- Wrote: ${path.relative(process.cwd(), notesPath)}`,
  ].join("\n") + "\n",
);

