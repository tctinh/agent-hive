/**
 * Hive Agents
 * 
 * The Hive Colony Model:
 * - Hive (Hybrid): Plans AND orchestrates based on phase
 * - Architect (Planner): Plans features, interviews, writes plans
 * - Swarm (Orchestrator): Delegates, spawns workers, verifies, merges
 * - Scout (Research/Collector): Explores codebase and external docs
 * - Forager (Worker/Coder): Executes tasks in isolation
 * - Hygienic (Consultant/Reviewer): Reviews plan quality
 */

// Bee agents (lean, focused)
export { hiveBeeAgent, QUEEN_BEE_PROMPT } from './hive';
export { architectBeeAgent, ARCHITECT_BEE_PROMPT } from './architect';
export { swarmBeeAgent, SWARM_BEE_PROMPT } from './swarm';
export { scoutBeeAgent, SCOUT_BEE_PROMPT } from './scout';
export { foragerBeeAgent, FORAGER_BEE_PROMPT } from './forager';
export { hygienicBeeAgent, HYGIENIC_BEE_PROMPT } from './hygienic';


/**
 * Agent registry for OpenCode plugin
 * 
 * Bee Agents (recommended):
 * - hive: Hybrid planner + orchestrator (detects phase, loads skills)
 * - architect: Discovery/planning (requirements, plan writing)
 * - swarm: Orchestration (delegates, verifies, merges)
 * - scout: Research/collection (codebase + external docs/data)
 * - forager: Worker/coder (executes tasks in worktrees)
 * - hygienic: Consultant/reviewer (plan quality)
 */
export const hiveAgents = {
  // Bee Agents (lean, focused - recommended)
  hive: {
    name: 'Hive (Hybrid)',
    description: 'Hybrid planner + orchestrator. Detects phase, loads skills on-demand.',
    mode: 'primary' as const,
  },
  architect: {
    name: 'Architect (Planner)',
    description: 'Plans features, interviews, writes plans. NEVER executes.',
    mode: 'primary' as const,
  },
  swarm: {
    name: 'Swarm (Orchestrator)',
    description: 'Orchestrates execution. Delegates, spawns workers, verifies, merges.',
    mode: 'primary' as const,
  },
  scout: {
    name: 'Scout (Explorer/Researcher/Retrieval)',
    description: 'Explores codebase, external docs, and retrieves external data.',
    mode: 'subagent' as const,
  },
  forager: {
    name: 'Forager (Worker/Coder)',
    description: 'Executes tasks directly in isolated worktrees. Never delegates.',
    mode: 'subagent' as const,
  },
  hygienic: {
    name: 'Hygienic (Consultant/Reviewer/Debugger)',
    description: 'Reviews plan documentation quality. OKAY/REJECT verdict.',
    mode: 'subagent' as const,
  },
};
