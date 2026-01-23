import type { RemoteMcpConfig } from './types';

export const websearchMcp: RemoteMcpConfig = {
  type: 'remote',
  url: 'https://mcp.exa.ai/mcp?tools=web_search_exa',
  headers: process.env.EXA_API_KEY
    ? { 'x-api-key': process.env.EXA_API_KEY }
    : undefined,
  oauth: false,
};
