export type ContextRole = 'human' | 'scratchpad' | 'operational' | 'durable';

export interface ContextHandlingMetadata {
  role: ContextRole;
  includeInExecution: boolean;
  includeInAgentsMdSync: boolean;
}

const SPECIAL_CONTEXTS: Record<string, ContextHandlingMetadata> = {
  overview: { role: 'human', includeInExecution: false, includeInAgentsMdSync: false },
  draft: { role: 'scratchpad', includeInExecution: false, includeInAgentsMdSync: false },
  'execution-decisions': { role: 'operational', includeInExecution: false, includeInAgentsMdSync: false },
};

export function classifyContextName(name: string): ContextHandlingMetadata {
  return SPECIAL_CONTEXTS[name] ?? {
    role: 'durable',
    includeInExecution: true,
    includeInAgentsMdSync: true,
  };
}
