/**
 * Agent selection for OMO-Slim delegation.
 * Maps task content patterns to specialized agent types.
 */

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
}

const AGENT_PATTERNS: AgentPattern[] = [
  // Research & exploration
  { pattern: /\b(find|search|locate|where|grep|explore|scan)\b/i, agent: 'explore' },
  { pattern: /\b(research|investigate|learn|understand|docs?|documentation|library|api)\b/i, agent: 'librarian' },
  
  // Frontend & UI
  { pattern: /\b(ui|ux|component|frontend|react|vue|svelte|css|style|layout|design|button|form|modal)\b/i, agent: 'frontend-ui-ux-engineer' },
  
  // Code quality
  { pattern: /\b(refactor|simplify|clean|reduce|complexity|review|optimize)\b/i, agent: 'code-simplicity-reviewer' },
  
  // Documentation
  { pattern: /\b(readme|document|explain|write.*doc|comment|jsdoc|tsdoc)\b/i, agent: 'document-writer' },
  
  // Visual/images
  { pattern: /\b(image|screenshot|visual|diagram|mockup|pdf|picture|photo)\b/i, agent: 'multimodal-looker' },
  
  // Architecture decisions
  { pattern: /\b(architect|design.*decision|tradeoff|approach|strategy|choose|decide|compare)\b/i, agent: 'oracle' },
];

/**
 * Select the best OMO-Slim agent for a task based on content analysis.
 * 
 * @param taskName - The task name/title
 * @param spec - The task specification/description
 * @returns The selected agent type
 */
export function selectAgent(taskName: string, spec: string): OmoSlimAgent {
  const content = `${taskName} ${spec}`.toLowerCase();
  
  for (const { pattern, agent } of AGENT_PATTERNS) {
    if (pattern.test(content)) {
      return agent;
    }
  }
  
  // Default: general purpose agent for implementation
  return 'general';
}

/**
 * Get a human-readable description of an agent's purpose.
 */
export function getAgentDescription(agent: OmoSlimAgent): string {
  const descriptions: Record<OmoSlimAgent, string> = {
    'general': 'General-purpose implementation agent',
    'explore': 'Codebase search and pattern matching',
    'librarian': 'External documentation and library research',
    'oracle': 'Architecture decisions and technical guidance',
    'frontend-ui-ux-engineer': 'UI/UX and frontend implementation',
    'document-writer': 'Technical documentation writing',
    'multimodal-looker': 'Image and visual content analysis',
    'code-simplicity-reviewer': 'Code review and simplification',
  };
  return descriptions[agent];
}

/**
 * Get all available agent types.
 */
export function getAvailableAgents(): OmoSlimAgent[] {
  return [
    'general',
    'explore',
    'librarian',
    'oracle',
    'frontend-ui-ux-engineer',
    'document-writer',
    'multimodal-looker',
    'code-simplicity-reviewer',
  ];
}
