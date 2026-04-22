import { execFileSync } from 'node:child_process';
import path from 'node:path';

function getPackageDirectory(packageName) {
  return path.resolve(import.meta.dirname, '..', '..', 'packages', packageName);
}

function readCommandErrorText(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const output = [error.message];

  if ('stdout' in error && error.stdout) {
    output.push(String(error.stdout));
  }

  if ('stderr' in error && error.stderr) {
    output.push(String(error.stderr));
  }

  return output.join('\n');
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

export function interpretPublishReadiness({ npmUser, packageName, packageExists, collaborators }) {
  if (!packageExists) {
    if (!npmUser) {
      throw new Error('npm whoami returned an empty username');
    }

    return {
      status: 'first-publish',
      npmUser,
      packageName,
    };
  }

  return {
    status: 'existing-package',
    npmUser,
    packageName,
    access: validateNpmPublishAccess({
      npmUser,
      collaborators,
      packageName,
    }),
  };
}

export function resolvePublishReadiness({ npmUser, packageName, packageExists, readCollaborators }) {
  if (!packageExists) {
    return interpretPublishReadiness({
      npmUser,
      packageName,
      packageExists,
      collaborators: null,
    });
  }

  return interpretPublishReadiness({
    npmUser,
    packageName,
    packageExists,
    collaborators: readCollaborators(),
  });
}

function readNpmUser(packageDirectory) {
  return execFileSync('npm', ['whoami'], {
    cwd: packageDirectory,
    encoding: 'utf8',
  }).trim();
}

function readPackageExists(packageName, packageDirectory) {
  try {
    execFileSync('npm', ['view', packageName, 'name', '--json'], {
      cwd: packageDirectory,
      encoding: 'utf8',
    });
    return true;
  } catch (error) {
    const errorText = readCommandErrorText(error);

    if (errorText.includes('E404') || errorText.includes('404 Not Found')) {
      return false;
    }

    throw error;
  }
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

  const packageExists = readPackageExists(packageName, packageDirectory);
  const readiness = resolvePublishReadiness({
    npmUser,
    packageName,
    packageExists,
    readCollaborators: () => readCollaborators(packageName, packageDirectory),
  });

  if (readiness.status === 'first-publish') {
    console.log(`npm publish preflight passed for ${packageName}: ${npmUser} (first publish)`);
    return;
  }

  console.log(`npm publish preflight passed for ${packageName}: ${npmUser} (${readiness.access})`);
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
