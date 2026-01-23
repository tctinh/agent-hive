import type { LocalMcpConfig } from './types';

export const astGrepMcp: LocalMcpConfig = {
  type: 'local',
  command: ['npx', '-y', '@notprolands/ast-grep-mcp'],
};
