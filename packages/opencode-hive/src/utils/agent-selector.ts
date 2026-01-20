/**
 * Agent selection for OMO-Slim delegation.
 * Maps task content patterns to specialized agent types.
 * 
 * Available agents in OMO-Slim config:
 * - orchestrator: Main orchestrator (not for delegation)
 * - oracle: Architecture decisions, complex debugging, code review
 * - librarian: External docs, library research, GitHub examples
 * - explorer: Fast codebase search, pattern matching
 * - designer: UI/UX, styling, component architecture
 * - fixer: Fast implementation, receives context and executes
 */

export type OmoSlimAgent = 
  | 'fixer'
  | 'explorer'
  | 'librarian'
  | 'oracle'
  | 'designer';

interface AgentPattern {
  pattern: RegExp;
  agent: OmoSlimAgent;
}

const AGENT_PATTERNS: AgentPattern[] = [
  // Research & exploration
  { pattern: /\b(find|search|locate|where|grep|explore|scan|codebase)\b/i, agent: 'explorer' },
  { pattern: /\b(research|investigate|learn|docs?|documentation|library|api|external|github)\b/i, agent: 'librarian' },
  
  // Frontend & UI
  { pattern: /\b(ui|ux|component|frontend|react|vue|svelte|css|style|layout|design|button|form|modal|visual|responsive)\b/i, agent: 'designer' },
  
  // Architecture decisions
  { pattern: /\b(architect|decision|tradeoff|approach|strategy|choose|decide|compare|review|debug|complex)\b/i, agent: 'oracle' },
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
  
  // Default: fixer for implementation tasks
  return 'fixer';
}

/**
 * Get a human-readable description of an agent's purpose.
 */
export function getAgentDescription(agent: OmoSlimAgent): string {
  const descriptions: Record<OmoSlimAgent, string> = {
    'fixer': 'Fast implementation specialist - receives context, executes code changes',
    'explorer': 'Fast codebase search and pattern matching',
    'librarian': 'External documentation and library research',
    'oracle': 'Strategic advisor - architecture, debugging, code review',
    'designer': 'UI/UX design and implementation',
  };
  return descriptions[agent];
}

/**
 * Get all available agent types.
 */
export function getAvailableAgents(): OmoSlimAgent[] {
  return [
    'fixer',
    'explorer',
    'librarian',
    'oracle',
    'designer',
  ];
}
