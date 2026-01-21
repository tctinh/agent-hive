/**
 * Hive Agents
 * 
 * The Hive Colony Model:
 * - Queen (User): Demands honey
 * - Scout (Planner): Finds flowers, writes plans
 * - Foragers (Workers): Gather nectar, execute tasks
 * - Receiver (Orchestrator): Integrates into hive, merges work
 */

export { scoutAgent, SCOUT_PROMPT } from './scout';
export { receiverAgent, RECEIVER_PROMPT } from './receiver';
export { foragerAgent, FORAGER_PROMPT } from './forager';

// Legacy export for backward compatibility
export { buildHiveAgentPrompt, hiveAgent } from './hive';

/**
 * Agent registry for OpenCode plugin
 */
export const hiveAgents = {
  scout: {
    name: 'scout',
    description: 'Scout - Discovery and planning. Finds flowers, writes plans.',
    mode: 'primary' as const,
  },
  receiver: {
    name: 'receiver', 
    description: 'Receiver - Orchestrates execution. Spawns workers, merges work.',
    mode: 'primary' as const,
  },
  forager: {
    name: 'forager',
    description: 'Forager - Executes tasks in isolation. Implements and verifies.',
    mode: 'subagent' as const,
  },
};
