export type RemoteMcpConfig = {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
  oauth?: boolean;
};

export type LocalMcpConfig = {
  type: 'local';
  command: string[];
  environment?: Record<string, string>;
};

export type McpConfig = RemoteMcpConfig | LocalMcpConfig;
