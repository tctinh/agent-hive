import { execFileSync } from 'node:child_process';
import path from 'node:path';

function getPackageDirectory(packageName) {
  return path.resolve(import.meta.dirname, '..', '..', 'packages', packageName);
}

export function validateNpmPublishAccess({ npmUser, collaborators, packageName }) {
  if (!npmUser) {
    throw new Error('npm whoami returned an empty username');
  }

  const access = collaborators[npmUser];

  if (!access) {
    throw new Error(`npm user ${npmUser} is not listed as a collaborator on ${packageName}`);
  }

  if (access !== 'read-write') {
    throw new Error(`npm user ${npmUser} has ${access} access to ${packageName}; expected read-write`);
  }

  return access;
}

function readNpmUser(packageDirectory) {
  return execFileSync('npm', ['whoami'], {
    cwd: packageDirectory,
    encoding: 'utf8',
  }).trim();
}

function readCollaborators(packageName, packageDirectory) {
  const collaboratorsJson = execFileSync('npm', ['access', 'list', 'collaborators', packageName, '--json'], {
    cwd: packageDirectory,
    encoding: 'utf8',
  });

  return JSON.parse(collaboratorsJson);
}

function validatePackage(packageName, npmUser) {
  const packageDirectory = getPackageDirectory(packageName);

  const access = validateNpmPublishAccess({
    npmUser,
    collaborators: readCollaborators(packageName, packageDirectory),
    packageName,
  });

  console.log(`npm publish preflight passed for ${packageName}: ${npmUser} (${access})`);
}

function main() {
  const packageNames = process.argv.slice(2);

  if (packageNames.length === 0) {
    throw new Error('Provide at least one npm package name to verify');
  }

  const npmUser = readNpmUser(getPackageDirectory(packageNames[0]));
  console.log(`Authenticated to npm as ${npmUser}`);

  for (const packageName of packageNames) {
    validatePackage(packageName, npmUser);
  }
}

if (import.meta.main) {
  main();
}
