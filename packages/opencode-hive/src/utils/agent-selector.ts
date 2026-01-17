/**
 * Agent selector for delegated task execution.
 * Maps task patterns to OMO-Slim agent types.
 */

// Agent types available in oh-my-opencode-slim
export type OmoSlimAgent =
  | 'general'
  | 'explore'
  | 'librarian'
  | 'oracle'
  | 'frontend-ui-ux-engineer'
  | 'document-writer'
  | 'multimodal-looker'
  | 'code-simplicity-reviewer';

interface AgentPattern {
  pattern: RegExp;
  agent: OmoSlimAgent;
  description: string;
}

/**
 * Pattern-to-agent mapping.
 * Order matters: first match wins.
 */
const AGENT_PATTERNS: AgentPattern[] = [
  // Testing patterns
  {
    pattern: /\b(test|spec|coverage|jest|vitest|mocha|pytest)\b/i,
    agent: 'explore',
    description: 'Testing and code exploration',
  },
  // UI/Frontend patterns
  {
    pattern: /\b(ui|component|frontend|react|vue|angular|css|style|tailwind|layout|button|modal|form)\b/i,
    agent: 'frontend-ui-ux-engineer',
    description: 'UI/UX and frontend development',
  },
  // Documentation patterns
  {
    pattern: /\b(doc|readme|comment|jsdoc|tsdoc|api\s?doc|changelog)\b/i,
    agent: 'document-writer',
    description: 'Documentation and comments',
  },
  // Refactoring patterns
  {
    pattern: /\b(refactor|simplify|clean|optimize|reduce|dedupe|dry)\b/i,
    agent: 'code-simplicity-reviewer',
    description: 'Code refactoring and simplification',
  },
  // Research patterns
  {
    pattern: /\b(research|investigate|find|explore|discover|audit|analyze|understand)\b/i,
    agent: 'librarian',
    description: 'Research and investigation',
  },
  // Visual/Image patterns
  {
    pattern: /\b(image|screenshot|visual|design|mockup|figma|sketch|icon)\b/i,
    agent: 'multimodal-looker',
    description: 'Visual and image analysis',
  },
  // Strategy patterns
  {
    pattern: /\b(architecture|design\s?pattern|strategy|approach|decision|plan)\b/i,
    agent: 'oracle',
    description: 'Architecture and strategy decisions',
  },
];

/**
 * Select the most appropriate agent for a task.
 * 
 * @param taskName - The task name from the plan
 * @param spec - The task specification/description
 * @returns The selected agent type
 */
export function selectAgent(taskName: string, spec: string = ''): OmoSlimAgent {
  const content = `${taskName} ${spec}`.toLowerCase();

  for (const { pattern, agent } of AGENT_PATTERNS) {
    if (pattern.test(content)) {
      return agent;
    }
  }

  // Default to general agent for implementation tasks
  return 'general';
}

/**
 * Get description for an agent type.
 */
export function getAgentDescription(agent: OmoSlimAgent): string {
  const descriptions: Record<OmoSlimAgent, string> = {
    'general': 'General-purpose implementation agent',
    'explore': 'Code exploration and testing specialist',
    'librarian': 'Research and documentation expert',
    'oracle': 'Architecture and strategy advisor',
    'frontend-ui-ux-engineer': 'UI/UX and frontend specialist',
    'document-writer': 'Documentation writer',
    'multimodal-looker': 'Visual and image analyzer',
    'code-simplicity-reviewer': 'Code quality and refactoring expert',
  };

  return descriptions[agent];
}

/**
 * Get all available agents with descriptions.
 */
export function listAgents(): Array<{ agent: OmoSlimAgent; description: string }> {
  const agents: OmoSlimAgent[] = [
    'general',
    'explore',
    'librarian',
    'oracle',
    'frontend-ui-ux-engineer',
    'document-writer',
    'multimodal-looker',
    'code-simplicity-reviewer',
  ];

  return agents.map(agent => ({
    agent,
    description: getAgentDescription(agent),
  }));
}
