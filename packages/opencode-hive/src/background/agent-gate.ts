/**
 * Agent discovery and capability gating for background tasks.
 * 
 * Provides:
 * - Dynamic agent discovery from OpenCode registry
 * - Validation that requested agents exist
 * - Safety gating to prevent recursion (orchestrator agents spawning themselves)
 * - Encapsulated logic for tool layer consumption
 */

import { OpencodeClient, AgentInfo, AgentValidationResult } from './types.js';

/**
 * Agents that should NEVER be spawned as background workers.
 * These are orchestrator-level agents that would cause recursion.
 */
const BLOCKED_AGENTS = new Set([
  'orchestrator',
  'hive',           // Hive Master - orchestrates, shouldn't be a worker
  'conductor',      // OMO-Slim orchestrator
  'main',           // Default main agent
]);

/**
 * Agents that require explicit allowance to spawn.
 * These have elevated capabilities that could be dangerous in background.
 */
const RESTRICTED_AGENTS = new Set([
  'admin',
  'root',
  'superuser',
]);

/**
 * Options for agent validation.
 */
export interface AgentValidationOptions {
  /** Allow restricted agents (requires explicit opt-in) */
  allowRestricted?: boolean;
  /** Custom blocked agents (merged with defaults) */
  additionalBlocked?: string[];
}

/**
 * Agent discovery and gating service.
 * Validates agents exist and are safe to spawn as background workers.
 */
export class AgentGate {
  private client: OpencodeClient;
  private cachedAgents: AgentInfo[] | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTtlMs = 30_000; // 30 seconds

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  /**
   * Get all available agents from OpenCode registry.
   * Results are cached for performance.
   */
  async discoverAgents(): Promise<AgentInfo[]> {
    const now = Date.now();
    
    // Return cached if still valid
    if (this.cachedAgents && now < this.cacheExpiry) {
      return this.cachedAgents;
    }

    try {
      const result = await this.client.app.agents({});
      const agents = (result.data ?? []) as AgentInfo[];
      
      this.cachedAgents = agents;
      this.cacheExpiry = now + this.cacheTtlMs;
      
      return agents;
    } catch (error) {
      // If we have stale cache, use it as fallback
      if (this.cachedAgents) {
        return this.cachedAgents;
      }
      
      // No cache available, throw
      throw new Error(
        `Failed to discover agents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate that an agent exists and is safe to spawn.
   * 
   * @param agentName - Name of the agent to validate
   * @param options - Validation options
   * @returns Validation result with agent info if valid
   */
  async validate(
    agentName: string,
    options: AgentValidationOptions = {}
  ): Promise<AgentValidationResult> {
    // Normalize agent name
    const name = agentName.trim().toLowerCase();

    // Check blocked agents first (fast path)
    if (BLOCKED_AGENTS.has(name)) {
      return {
        valid: false,
        error: `Agent "${agentName}" is an orchestrator agent and cannot be spawned as a background worker. ` +
               `Use a worker agent like "forager", "explorer", "librarian", or "designer".`,
      };
    }

    // Check additional blocked agents
    if (options.additionalBlocked?.includes(name)) {
      return {
        valid: false,
        error: `Agent "${agentName}" is blocked by configuration.`,
      };
    }

    // Check restricted agents
    if (RESTRICTED_AGENTS.has(name) && !options.allowRestricted) {
      return {
        valid: false,
        error: `Agent "${agentName}" is restricted and requires explicit allowance. ` +
               `Set allowRestricted: true to spawn this agent.`,
      };
    }

    // Discover available agents
    let agents: AgentInfo[];
    try {
      agents = await this.discoverAgents();
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to discover agents',
      };
    }

    // Find the requested agent
    const agent = agents.find(a => a.name.toLowerCase() === name);
    
    if (!agent) {
      const available = agents
        .filter(a => !BLOCKED_AGENTS.has(a.name.toLowerCase()))
        .map(a => `  • ${a.name}${a.description ? ` - ${a.description}` : ''}`)
        .join('\n');

      return {
        valid: false,
        error: `Agent "${agentName}" not found in registry.\n\nAvailable agents:\n${available || '(none)'}`,
      };
    }

    // Agent exists and passes all checks
    return {
      valid: true,
      agent,
    };
  }

  /**
   * Get a list of agents suitable for background work.
   * Filters out orchestrator and restricted agents.
   */
  async getWorkerAgents(): Promise<AgentInfo[]> {
    const agents = await this.discoverAgents();
    
    return agents.filter(a => {
      const name = a.name.toLowerCase();
      return !BLOCKED_AGENTS.has(name) && !RESTRICTED_AGENTS.has(name);
    });
  }

  /**
   * Clear the agent cache (for testing or forced refresh).
   */
  clearCache(): void {
    this.cachedAgents = null;
    this.cacheExpiry = 0;
  }

  /**
   * Check if an agent name is blocked.
   */
  isBlocked(agentName: string): boolean {
    return BLOCKED_AGENTS.has(agentName.trim().toLowerCase());
  }

  /**
   * Check if an agent name is restricted.
   */
  isRestricted(agentName: string): boolean {
    return RESTRICTED_AGENTS.has(agentName.trim().toLowerCase());
  }
}

/**
 * Create a new AgentGate instance.
 */
export function createAgentGate(client: OpencodeClient): AgentGate {
  return new AgentGate(client);
}
