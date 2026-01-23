/**
 * Hive Agents
 * 
 * The Hive Colony Model:
 * - Queen (User): Demands honey
 * - Architect Bee (Planner): Plans features, interviews, writes plans
 * - Swarm Bee (Orchestrator): Delegates, spawns workers, verifies, merges
 * - Scout Bee (Researcher): Explores codebase and external docs
 * - Forager Bee (Worker): Executes tasks in isolation
 * - Hygienic Bee (Reviewer): Reviews plan quality
 */

// Bee agents (lean, focused)
export { architectBeeAgent, ARCHITECT_BEE_PROMPT } from './architect-bee';
export { swarmBeeAgent, SWARM_BEE_PROMPT } from './swarm-bee';
export { scoutBeeAgent, SCOUT_BEE_PROMPT } from './scout-bee';
export { foragerBeeAgent, FORAGER_BEE_PROMPT } from './forager-bee';
export { hygienicBeeAgent, HYGIENIC_BEE_PROMPT } from './hygienic-bee';


/**
 * Agent registry for OpenCode plugin
 * 
 * Bee Agents (recommended):
 * - architect-bee: Plans features, interviews, writes plans
 * - swarm-bee: Orchestrates execution, delegates, verifies
 * - scout-bee: Researches codebase and external docs
 * - forager-bee: Executes tasks in isolated worktrees
 * - hygienic-bee: Reviews plan documentation quality
 */
export const hiveAgents = {
  // Bee Agents (lean, focused - recommended)
  'architect-bee': {
    name: 'architect-bee',
    description: 'Architect Bee - Plans features, interviews, writes plans. NEVER executes.',
    mode: 'primary' as const,
  },
  'swarm-bee': {
    name: 'swarm-bee',
    description: 'Swarm Bee - Orchestrates execution. Delegates, spawns workers, verifies, merges.',
    mode: 'primary' as const,
  },
  'scout-bee': {
    name: 'scout-bee',
    description: 'Scout Bee - Researches in parallel. Codebase exploration + external docs.',
    mode: 'subagent' as const,
  },
  'forager-bee': {
    name: 'forager-bee',
    description: 'Forager Bee - Executes tasks directly in isolated worktrees. Never delegates.',
    mode: 'subagent' as const,
  },
  'hygienic-bee': {
    name: 'hygienic-bee',
    description: 'Hygienic Bee - Reviews plan documentation quality. OKAY/REJECT verdict.',
    mode: 'subagent' as const,
  },
};
