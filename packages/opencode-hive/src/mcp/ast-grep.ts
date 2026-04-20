import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { LocalMcpConfig } from './types';

const require = createRequire(import.meta.url);

function resolveDependencyRoot(packageName: string): string {
  return path.dirname(require.resolve(`${packageName}/package.json`));
}

function resolveAstGrepBinary(): string {
  const packageName = (() => {
    if (process.platform === 'linux' && process.arch === 'x64') return '@ast-grep/cli-linux-x64-gnu';
    if (process.platform === 'linux' && process.arch === 'arm64') return '@ast-grep/cli-linux-arm64-gnu';
    if (process.platform === 'darwin' && process.arch === 'x64') return '@ast-grep/cli-darwin-x64';
    if (process.platform === 'darwin' && process.arch === 'arm64') return '@ast-grep/cli-darwin-arm64';
    if (process.platform === 'win32' && process.arch === 'x64') return '@ast-grep/cli-win32-x64-msvc';
    if (process.platform === 'win32' && process.arch === 'arm64') return '@ast-grep/cli-win32-arm64-msvc';
    if (process.platform === 'win32' && process.arch === 'ia32') return '@ast-grep/cli-win32-ia32-msvc';

    throw new Error(`Unsupported platform for bundled ast-grep CLI: ${process.platform}/${process.arch}`);
  })();

  return path.join(resolveDependencyRoot(packageName), process.platform === 'win32' ? 'ast-grep.exe' : 'ast-grep');
}

const uvPath = path.join(resolveDependencyRoot('@manzt/uv'), process.platform === 'win32' ? 'uv.exe' : 'uv');
const astGrepBinary = resolveAstGrepBinary();
const astGrepDir = path.dirname(astGrepBinary);
const inheritedPath = process.env.PATH ?? process.env.Path ?? '';
const upstreamServer = 'git+https://github.com/ast-grep/ast-grep-mcp';

export const astGrepMcp: LocalMcpConfig = {
  type: 'local',
  command: [uvPath, 'tool', 'run', '--from', upstreamServer, 'ast-grep-server'],
  environment: {
    PATH: inheritedPath ? `${astGrepDir}${path.delimiter}${inheritedPath}` : astGrepDir,
  },
};
