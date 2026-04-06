import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { tool, type Plugin, type ToolDefinition } from "@opencode-ai/plugin";
import { getFilteredSkills, loadBuiltinSkill } from './skills/builtin.js';
import { loadFileSkill } from './skills/file-loader.js';
import { BUILTIN_SKILLS } from './skills/registry.generated.js';
import type { SkillDefinition } from './skills/types.js';
// Bee agents (lean, focused)
import { QUEEN_BEE_PROMPT } from './agents/hive.js';
import { ARCHITECT_BEE_PROMPT } from './agents/architect.js';
import { SWARM_BEE_PROMPT } from './agents/swarm.js';
import { SCOUT_BEE_PROMPT } from './agents/scout.js';
import { FORAGER_BEE_PROMPT } from './agents/forager.js';
import { HYGIENIC_BEE_PROMPT } from './agents/hygienic.js';
import { buildCustomSubagents } from './agents/custom-agents.js';
import { createBuiltinMcps } from './mcp/index.js';

// ============================================================================
// Skill Tool - Uses generated registry (no file-based discovery)
// ============================================================================

function formatSkillsXml(skills: SkillDefinition[]): string {
  if (skills.length === 0) return '';

  const skillsXml = skills.map(skill => {
    return [
      '  <skill>',
      `    <name>${skill.name}</name>`,
      `    <description>(hive - Skill) ${skill.description}</description>`,
      '  </skill>',
    ].join('\n');
  }).join('\n');

  return `\n\n<available_skills>\n${skillsXml}\n</available_skills>`;
}

/**
 * Build auto-loaded skill templates for an agent.
 * Returns a string containing all skill templates to append to the agent's prompt.
 * 
 * Resolution order for each skill ID:
 * 1. Builtin skill (wins if exists)
 * 2. File-based skill (project OpenCode -> global OpenCode -> project Claude -> global Claude)
 * 3. Warn and skip if not found
 */
async function buildAutoLoadedSkillsContent(
  agentName: string,
  configService: ConfigService,
  projectRoot: string,
  autoLoadSkillsOverride?: string[],
): Promise<string> {
  const autoLoadSkills = autoLoadSkillsOverride
    ?? (((configService as unknown as {
      getAgentConfig: (name: string) => { autoLoadSkills?: string[] };
    }).getAgentConfig(agentName).autoLoadSkills) ?? []);

  if (autoLoadSkills.length === 0) {
    return '';
  }

  // Use process.env.HOME for testability, fallback to os.homedir()
  const homeDir = process.env.HOME || os.homedir();
  const skillTemplates: string[] = [];
  
  for (const skillId of autoLoadSkills) {
    // 1. Try builtin skill first (builtin wins)
    const builtinSkill = BUILTIN_SKILLS.find((entry) => entry.name === skillId);
    if (builtinSkill) {
      skillTemplates.push(builtinSkill.template);
      continue;
    }
    
    // 2. Fallback to file-based skill
    const fileResult = await loadFileSkill(skillId, projectRoot, homeDir);
    if (fileResult.found && fileResult.skill) {
      skillTemplates.push(fileResult.skill.template);
      continue;
    }
    
    // 3. Not found - warn and skip
    console.warn(`[hive] Unknown skill id "${skillId}" for agent "${agentName}"`);
  }

  if (skillTemplates.length === 0) {
    return '';
  }

  return '\n\n' + skillTemplates.join('\n\n');
}

type CompatibleCustomAgentConfig = {
  baseAgent: 'forager-worker' | 'hygienic-reviewer';
  description: string;
  autoLoadSkills?: string[];
};

function getCustomAgentConfigsCompat(configService: ConfigService): Record<string, CompatibleCustomAgentConfig> {
  const serviceWithMethod = configService as ConfigService & {
    getCustomAgentConfigs?: () => Record<string, CompatibleCustomAgentConfig>;
    get?: () => { customAgents?: Record<string, unknown> };
  };

  if (typeof serviceWithMethod.getCustomAgentConfigs === 'function') {
    return serviceWithMethod.getCustomAgentConfigs();
  }

  const rawConfig = serviceWithMethod.get?.() as { customAgents?: Record<string, unknown> } | undefined;
  const rawCustomAgents = rawConfig?.customAgents;
  if (!rawCustomAgents || typeof rawCustomAgents !== 'object') {
    return {};
  }

  const compatibleEntries = Object.entries(rawCustomAgents).flatMap(([name, config]) => {
    if (!config || typeof config !== 'object') {
      return [];
    }

    const record = config as Record<string, unknown>;
    const baseAgent = record.baseAgent;
    if (baseAgent !== 'forager-worker' && baseAgent !== 'hygienic-reviewer') {
      return [];
    }

    return [[name, {
      baseAgent,
      description: typeof record.description === 'string' ? record.description : 'Custom subagent',
      autoLoadSkills: Array.isArray(record.autoLoadSkills)
        ? record.autoLoadSkills.filter((skill): skill is string => typeof skill === 'string')
        : [],
    } satisfies CompatibleCustomAgentConfig]];
  });

  return Object.fromEntries(compatibleEntries);
}

function createHiveSkillTool(filteredSkills: SkillDefinition[]): ToolDefinition {
  const base = `Load a Hive skill to get detailed instructions for a specific workflow.

Use this when a task matches an available skill's description. The descriptions below ("Use when...", "Use before...") are triggers; when one applies, you MUST load that skill before proceeding.`;
  const description = filteredSkills.length === 0
    ? base + '\n\nNo Hive skills available.'
    : base + formatSkillsXml(filteredSkills);

  // Build a set of available skill names for validation
  const availableNames = new Set(filteredSkills.map(s => s.name));

  return tool({
    description,
    args: {
      name: tool.schema.string().describe('The skill name from available_skills'),
    },
    async execute({ name }) {
      // Check if skill is available (not filtered out)
      if (!availableNames.has(name)) {
        const available = filteredSkills.map(s => s.name).join(', ');
        throw new Error(`Skill "${name}" not available. Available Hive skills: ${available || 'none'}`);
      }

      const result = loadBuiltinSkill(name);

      if (!result.found || !result.skill) {
        const available = filteredSkills.map(s => s.name).join(', ');
        throw new Error(`Skill "${name}" not found. Available Hive skills: ${available || 'none'}`);
      }

      const skill = result.skill;
      return [
        `## Hive Skill: ${skill.name}`,
        '',
        `**Description**: ${skill.description}`,
        '',
        skill.template,
      ].join('\n');
    },
  });
}

// ============================================================================
import {
  WorktreeService,
  FeatureService,
  PlanService,
  TaskService,
  ContextService,
  ConfigService,
  AgentsMdService,
  DockerSandboxService,
  SessionService,
  buildEffectiveDependencies,
  computeRunnableAndBlocked,
  detectContext,
  normalizePath,
  resolveFeatureDirectoryName,
  type WorktreeInfo,
} from "hive-core";
import { buildWorkerPrompt, type ContextFile, type CompletedTask } from "./utils/worker-prompt";
import { calculatePromptMeta, calculatePayloadMeta, checkWarnings } from "./utils/prompt-observability";
import { applyTaskBudget, applyContextBudget, DEFAULT_BUDGET, type TruncationEvent } from "./utils/prompt-budgeting";
import { writeWorkerPromptFile } from "./utils/prompt-file";
import { formatRelativeTime } from "./utils/format";
import { createVariantHook } from "./hooks/variant-hook.js";
import { HIVE_SYSTEM_PROMPT, shouldExecuteHook } from "./hooks/system-hook.js";
import { buildCompactionReanchor } from "./utils/compaction-anchor.js";
import type { CompactionSessionContext } from "./utils/compaction-anchor.js";

/**
 * Core plugin implementation.
 */
type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

const plugin: Plugin = async (ctx) => {
  const { directory, client, worktree } = ctx;

  const featureService = new FeatureService(directory);
  const planService = new PlanService(directory);
  const taskService = new TaskService(directory);
  const contextService = new ContextService(directory);
  const agentsMdService = new AgentsMdService(directory, contextService);
  const configService = new ConfigService(); // User config at ~/.config/opencode/agent_hive.json
  const sessionService = new SessionService(directory);
  const disabledMcps = configService.getDisabledMcps();
  const disabledSkills = configService.getDisabledSkills();
  const builtinMcps = createBuiltinMcps(disabledMcps);
  
  // Get filtered skills (globally disabled skills removed)
  // Per-agent skill filtering could be added here based on agent context
  const filteredSkills = getFilteredSkills(disabledSkills);
  const effectiveAutoLoadSkills = configService.getAgentConfig('hive-master').autoLoadSkills ?? [];
  const worktreeService = new WorktreeService({
    baseDir: directory,
    hiveDir: path.join(directory, '.hive'),
  });

  const customAgentConfigsForClassification = getCustomAgentConfigsCompat(configService);
  const runtimeContext = detectContext(worktree || directory);
  const taskWorkerRecovery = runtimeContext.isWorktree && runtimeContext.feature && runtimeContext.task
    ? {
        featureName: runtimeContext.feature,
        taskFolder: runtimeContext.task,
        workerPromptPath: path.posix.join(
          '.hive',
          'features',
          resolveFeatureDirectoryName(directory, runtimeContext.feature),
          'tasks',
          runtimeContext.task,
          'worker-prompt.md',
        ),
      }
    : undefined;

  /**
   * Check if OMO-Slim delegation is enabled via user config.
   * Users enable this in ~/.config/opencode/agent_hive.json
   */
  const isOmoSlimEnabled = (): boolean => {
    return configService.isOmoSlimEnabled();
  };

  const resolveFeature = (explicit?: string): string | null => {
    if (explicit) return explicit;

    const context = detectContext(directory);
    if (context.feature) return context.feature;

    return featureService.getActive()?.name ?? null;
  };

  const captureSession = (feature: string, toolContext: unknown) => {
    const ctx = toolContext as ToolContext;
    if (ctx?.sessionID) {
      const currentSession = featureService.getSession(feature);
      if (currentSession !== ctx.sessionID) {
        featureService.setSession(feature, ctx.sessionID);
      }
    }
  };

  const bindFeatureSession = (
    feature: string,
    toolContext: unknown,
    patch?: Partial<{ taskFolder: string; workerPromptPath: string }>,
  ) => {
    const ctx = toolContext as ToolContext;
    if (!ctx?.sessionID) return;
    sessionService.bindFeature(ctx.sessionID, feature, patch as any);
  };

  type ReplayMessageInfo = {
    id: string;
    sessionID: string;
    role: 'user' | 'assistant';
    time: { created: number };
  };

  type ReplayPart = {
    id: string;
    sessionID: string;
    messageID: string;
    type: string;
    text?: string;
    synthetic?: boolean;
  };

  type ReplayMessageEntry = {
    info: ReplayMessageInfo;
    parts: ReplayPart[];
  };

  const extractTextParts = (parts: ReplayPart[] | unknown): string[] => {
    if (!Array.isArray(parts)) return [];
    return parts
      .filter((part): part is ReplayPart & { type: 'text'; text: string; synthetic?: boolean } => {
        return !!part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string';
      })
      .map((part) => part.text.trim())
      .filter(Boolean);
  };

  const shouldCaptureDirective = (info: ReplayMessageInfo, parts: ReplayPart[]): boolean => {
    if (info.role !== 'user') return false;
    const textParts = parts.filter((part): part is ReplayPart & { type: 'text'; synthetic?: boolean } => {
      return !!part && typeof part === 'object' && part.type === 'text';
    });
    if (textParts.length === 0) return false;
    return !textParts.every((part) => part.synthetic === true);
  };

  const buildDirectiveReplayText = (session: { agent?: string; baseAgent?: string; directivePrompt?: string; sessionKind?: string }): string | null => {
    if (!session.directivePrompt) return null;
    const role = session.agent === 'scout-researcher' || session.baseAgent === 'scout-researcher'
      ? 'Scout'
      : session.agent === 'hygienic-reviewer' || session.baseAgent === 'hygienic-reviewer'
        ? 'Hygienic'
        : session.agent === 'architect-planner' || session.baseAgent === 'architect-planner'
          ? 'Architect'
          : session.agent === 'swarm-orchestrator' || session.baseAgent === 'swarm-orchestrator'
            ? 'Swarm'
            : session.agent === 'hive-master' || session.baseAgent === 'hive-master'
              ? 'Hive'
              : 'current role';

    return [
      `Post-compaction recovery: You are still ${role}.`,
      'Resume the original assignment below. Do not replace it with a new goal.',
      'Do not broaden the scope or re-read the full codebase.',
      'If the exact next step is not explicit in the original assignment, return control to the parent/orchestrator immediately instead of improvising.',
      '',
      session.directivePrompt,
    ].join('\n');
  };

  const shouldUseDirectiveReplay = (session: { sessionKind?: string } | undefined): boolean => {
    return session?.sessionKind === 'primary' || session?.sessionKind === 'subagent';
  };

  const getDirectiveReplayCompactionPatch = (session: { directivePrompt?: string; directiveRecoveryState?: 'available' | 'consumed' | 'escalated'; sessionKind?: string } | undefined) => {
    if (!session?.directivePrompt || !shouldUseDirectiveReplay(session)) {
      return null;
    }

    if (session.directiveRecoveryState === 'escalated') {
      return null;
    }

    if (session.directiveRecoveryState === 'consumed') {
      return {
        directiveRecoveryState: 'escalated' as const,
        replayDirectivePending: true,
      };
    }

    return {
      directiveRecoveryState: 'available' as const,
      replayDirectivePending: true,
    };
  };

  const shouldUseWorkerReplay = (session: { sessionKind?: string; featureName?: string; taskFolder?: string; workerPromptPath?: string } | undefined): boolean => {
    return session?.sessionKind === 'task-worker'
      && !!session.featureName
      && !!session.taskFolder
      && !!session.workerPromptPath;
  };

  const buildWorkerReplayText = (session: { agent?: string; baseAgent?: string; featureName?: string; taskFolder?: string; workerPromptPath?: string }): string | null => {
    if (!session.featureName || !session.taskFolder || !session.workerPromptPath) return null;
    const role = 'Forager';
    return [
      `Post-compaction recovery: You are still the ${role} worker for task ${session.taskFolder}.`,
      `Resume only this task. Do not merge, do not start the next task, and do not replace this assignment with a new goal.`,
      `Do not call orchestration tools unless the worker prompt explicitly says so.`,
      `Re-read @${session.workerPromptPath} and continue from the existing worktree state.`,
    ].join('\n');
  };

  /**
   * Check if a feature is blocked by the Beekeeper.
   * Returns the block message if blocked, null otherwise.
   * 
   * File protocol: .hive/features/<name>/BLOCKED
   * - If file exists, feature is blocked
   * - File contents = reason for blocking
   */
  const checkBlocked = (feature: string): string | null => {
    const fs = require('fs');
    const featureDir = resolveFeatureDirectoryName(directory, feature);
    const blockedPath = path.join(directory, '.hive', 'features', featureDir, 'BLOCKED');
    if (fs.existsSync(blockedPath)) {
      const reason = fs.readFileSync(blockedPath, 'utf-8').trim();
      return `⛔ BLOCKED by Beekeeper

${reason || '(No reason provided)'}

The human has blocked this feature. Wait for them to unblock it.
To unblock: Remove .hive/features/${featureDir}/BLOCKED`;
    }
    return null;
  };

  // ============================================================================
  // Hook Cadence Management
  // ============================================================================
  
  /**
   * Turn counters for hook cadence management.
   * Each hook tracks its own invocation count to determine when to fire.
   */
  const turnCounters: Record<string, number> = {};

  const checkDependencies = (feature: string, taskFolder: string): { allowed: boolean; error?: string } => {
    const taskStatus = taskService.getRawStatus(feature, taskFolder);
    if (!taskStatus) {
      return { allowed: true };
    }

    const tasks = taskService.list(feature).map(task => {
      const status = taskService.getRawStatus(feature, task.folder);
      return {
        folder: task.folder,
        status: task.status,
        dependsOn: status?.dependsOn,
      };
    });

    const effectiveDeps = buildEffectiveDependencies(tasks);
    const deps = effectiveDeps.get(taskFolder) ?? [];

    if (deps.length === 0) {
      return { allowed: true };
    }

    const unmetDeps: Array<{ folder: string; status: string }> = [];

    for (const depFolder of deps) {
      const depStatus = taskService.getRawStatus(feature, depFolder);

      if (!depStatus || depStatus.status !== 'done') {
        unmetDeps.push({
          folder: depFolder,
          status: depStatus?.status ?? 'unknown',
        });
      }
    }

    if (unmetDeps.length > 0) {
      const depList = unmetDeps
        .map(d => `"${d.folder}" (${d.status})`)
        .join(', ');

      return {
        allowed: false,
        error: `Dependency constraint: Task "${taskFolder}" cannot start - dependencies not done: ${depList}. ` +
          `Only tasks with status 'done' satisfy dependencies.`,
      };
    }

    return { allowed: true };
  };

  const respond = (payload: Record<string, unknown>) => JSON.stringify(payload, null, 2);

  const buildWorktreeLaunchResponse = async ({
    feature,
    task,
    taskInfo,
    worktree,
    continueFrom,
    decision,
  }: {
    feature: string;
    task: string;
    taskInfo: NonNullable<ReturnType<typeof taskService.get>>;
    worktree: WorktreeInfo;
    continueFrom?: 'blocked';
    decision?: string;
  }) => {
    taskService.update(feature, task, {
      status: 'in_progress',
      baseCommit: worktree.commit,
    });

    const planResult = planService.read(feature);
    const allTasks = taskService.list(feature);

    const executionContextFiles = typeof (contextService as ContextService & {
      listExecutionContext?: (featureName: string) => Array<{ name: string; content: string }>;
    }).listExecutionContext === 'function'
      ? (contextService as ContextService & {
          listExecutionContext: (featureName: string) => Array<{ name: string; content: string }>;
        }).listExecutionContext(feature)
      : contextService.list(feature).filter(f => f.name !== 'overview');

    const rawContextFiles = executionContextFiles.map(f => ({
      name: f.name,
      content: f.content,
    }));

    const rawPreviousTasks = allTasks
      .filter(t => t.status === 'done' && t.summary)
      .map(t => ({ name: t.folder, summary: t.summary! }));

    const taskBudgetResult = applyTaskBudget(rawPreviousTasks, { ...DEFAULT_BUDGET, feature });
    const contextBudgetResult = applyContextBudget(rawContextFiles, { ...DEFAULT_BUDGET, feature });

    const contextFiles: ContextFile[] = contextBudgetResult.files.map(f => ({
      name: f.name,
      content: f.content,
    }));
    const previousTasks: CompletedTask[] = taskBudgetResult.tasks.map(t => ({
      name: t.name,
      summary: t.summary,
    }));

    const truncationEvents: TruncationEvent[] = [
      ...taskBudgetResult.truncationEvents,
      ...contextBudgetResult.truncationEvents,
    ];

    const droppedTasksHint = taskBudgetResult.droppedTasksHint;

    const taskOrder = parseInt(taskInfo.folder.match(/^(\d+)/)?.[1] || '0', 10);
    const status = taskService.getRawStatus(feature, task);
    const dependsOn = status?.dependsOn ?? [];

    let specContent: string;
    const existingManualSpec = status?.origin === 'manual'
      ? taskService.readSpec(feature, task)
      : null;

    if (existingManualSpec) {
      specContent = existingManualSpec;
    } else {
      specContent = taskService.buildSpecContent({
        featureName: feature,
        task: {
          folder: task,
          name: taskInfo.planTitle ?? taskInfo.name,
          order: taskOrder,
          description: undefined,
        },
        dependsOn,
        allTasks: allTasks.map(t => ({
          folder: t.folder,
          name: t.name,
          order: parseInt(t.folder.match(/^(\d+)/)?.[1] || '0', 10),
        })),
        planContent: planResult?.content ?? null,
        contextFiles,
        completedTasks: previousTasks,
      });

      taskService.writeSpec(feature, task, specContent);
    }

    const workerPrompt = buildWorkerPrompt({
      feature,
      task,
      taskOrder,
      worktreePath: worktree.path,
      branch: worktree.branch,
      plan: planResult?.content || 'No plan available',
      contextFiles,
      spec: specContent,
      previousTasks,
      continueFrom: continueFrom === 'blocked' ? {
        status: 'blocked',
        previousSummary: (taskInfo as any).summary || 'No previous summary',
        decision: decision || 'No decision provided',
      } : undefined,
    });

    const customAgentConfigs = getCustomAgentConfigsCompat(configService);
    const defaultAgent = 'forager-worker';
    const eligibleAgents = [
      {
        name: defaultAgent,
        baseAgent: defaultAgent,
        description: 'Default implementation worker',
      },
      ...Object.entries(customAgentConfigs)
        .filter(([, config]) => config.baseAgent === 'forager-worker')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, config]) => ({
          name,
          baseAgent: config.baseAgent,
          description: config.description,
        })),
    ];
    const agent = defaultAgent;

    const rawStatus = taskService.getRawStatus(feature, task);
    const attempt = (rawStatus?.workerSession?.attempt || 0) + 1;
    const idempotencyKey = `hive-${feature}-${task}-${attempt}`;

    taskService.patchBackgroundFields(feature, task, { idempotencyKey });

    const contextContent = contextFiles.map(f => f.content).join('\n\n');
    const previousTasksContent = previousTasks.map(t => `- **${t.name}**: ${t.summary}`).join('\n');
    const promptMeta = calculatePromptMeta({
      plan: planResult?.content || '',
      context: contextContent,
      previousTasks: previousTasksContent,
      spec: specContent,
      workerPrompt,
    });

    const hiveDir = path.join(directory, '.hive');
    const workerPromptPath = writeWorkerPromptFile(feature, task, workerPrompt, hiveDir);
    const relativePromptPath = normalizePath(path.relative(directory, workerPromptPath));

    const PREVIEW_MAX_LENGTH = 200;
    const workerPromptPreview = workerPrompt.length > PREVIEW_MAX_LENGTH
      ? workerPrompt.slice(0, PREVIEW_MAX_LENGTH) + '...'
      : workerPrompt;

    const taskToolPrompt = `Follow instructions in @${relativePromptPath}`;

    const taskToolInstructions = `## Delegation Required

Choose one of the eligible forager-derived agents below.
Default to \`${defaultAgent}\` if no specialist is a better match.

${eligibleAgents.map((candidate) => `- \`${candidate.name}\` — ${candidate.description}`).join('\n')}

Use OpenCode's built-in \`task\` tool with the chosen \`subagent_type\` and the provided \`taskToolCall.prompt\` value.
\`taskToolCall.subagent_type\` is prefilled with the default for convenience; override it when a specialist in \`eligibleAgents\` is a better match.

\`\`\`
task({
  subagent_type: "<chosen-agent>",
  description: "Hive: ${task}",
  prompt: "${taskToolPrompt}"
})
\`\`\`

Use the \`@path\` attachment syntax in the prompt to reference the file. Do not inline the file contents.

`;

    const responseBase = {
      success: true,
      terminal: false,
      worktreePath: worktree.path,
      branch: worktree.branch,
      mode: 'delegate',
      agent,
      defaultAgent,
      eligibleAgents,
      delegationRequired: true,
      workerPromptPath: relativePromptPath,
      workerPromptPreview,
      taskPromptMode: 'opencode-at-file',
      taskToolCall: {
        subagent_type: agent,
        description: `Hive: ${task}`,
        prompt: taskToolPrompt,
      },
      instructions: taskToolInstructions,
    };

    const jsonPayload = JSON.stringify(responseBase, null, 2);
    const payloadMeta = calculatePayloadMeta({
      jsonPayload,
      promptInlined: false,
      promptReferencedByFile: true,
    });

    const sizeWarnings = checkWarnings(promptMeta, payloadMeta);
    const budgetWarnings = truncationEvents.map(event => ({
      type: event.type as string,
      severity: 'info' as const,
      message: event.message,
      affected: event.affected,
      count: event.count,
    }));
    const allWarnings = [...sizeWarnings, ...budgetWarnings];

    return respond({
      ...responseBase,
      promptMeta,
      payloadMeta,
      budgetApplied: {
        maxTasks: DEFAULT_BUDGET.maxTasks,
        maxSummaryChars: DEFAULT_BUDGET.maxSummaryChars,
        maxContextChars: DEFAULT_BUDGET.maxContextChars,
        maxTotalContextChars: DEFAULT_BUDGET.maxTotalContextChars,
        tasksIncluded: previousTasks.length,
        tasksDropped: rawPreviousTasks.length - previousTasks.length,
        droppedTasksHint,
      },
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    });
  };

  const executeWorktreeStart = async ({
    task,
    feature: explicitFeature,
  }: {
    task: string;
    feature?: string;
  }) => {
    const feature = resolveFeature(explicitFeature);
    if (!feature) {
      return respond({
        success: false,
        terminal: true,
        error: 'No feature specified. Create a feature or provide feature param.',
        reason: 'feature_required',
        task,
        hints: [
          'Create/select a feature first or pass the feature parameter explicitly.',
          'Use hive_status to inspect the active feature state before retrying.',
        ],
      });
    }

    const blockedMessage = checkBlocked(feature);
    if (blockedMessage) {
      return respond({
        success: false,
        terminal: true,
        error: blockedMessage,
        reason: 'feature_blocked',
        feature,
        task,
        hints: [
          'Wait for the human to unblock the feature before retrying.',
          `If approved, remove .hive/features/${resolveFeatureDirectoryName(directory, feature)}/BLOCKED and retry hive_worktree_start.`,
        ],
      });
    }

    const taskInfo = taskService.get(feature, task);
    if (!taskInfo) {
      return respond({
        success: false,
        terminal: true,
        error: `Task "${task}" not found`,
        reason: 'task_not_found',
        feature,
        task,
        hints: [
          'Check the task folder name in tasks.json or hive_status output.',
          'Run hive_tasks_sync if the approved plan has changed and tasks need regeneration.',
        ],
      });
    }

    if (taskInfo.status === 'done') {
      return respond({
        success: false,
        terminal: true,
        error: `Task "${task}" is already completed (status: done). It cannot be restarted.`,
        currentStatus: 'done',
        hints: [
          'Use hive_merge to integrate the completed task branch if not already merged.',
          'Use hive_status to see all task states and find the next runnable task.',
        ],
      });
    }

    if (taskInfo.status === 'blocked') {
      return respond({
        success: false,
        terminal: true,
        error: `Task "${task}" is blocked and must be resumed with hive_worktree_create using continueFrom: 'blocked'.`,
        currentStatus: 'blocked',
        feature,
        task,
        hints: [
          'Ask the user the blocker question, then call hive_worktree_create({ task, continueFrom: "blocked", decision }).',
          'Use hive_status to inspect blocker details before retrying.',
        ],
      });
    }

    const depCheck = checkDependencies(feature, task);
    if (!depCheck.allowed) {
      return respond({
        success: false,
        terminal: true,
        reason: 'dependencies_not_done',
        feature,
        task,
        error: depCheck.error,
        hints: [
          'Complete the required dependencies before starting this task.',
          'Use hive_status to see current task states.',
        ],
      });
    }

    const worktree = await worktreeService.create(feature, task);
    return buildWorktreeLaunchResponse({ feature, task, taskInfo, worktree });
  };

  const executeBlockedResume = async ({
    task,
    feature: explicitFeature,
    continueFrom,
    decision,
  }: {
    task: string;
    feature?: string;
    continueFrom?: 'blocked';
    decision?: string;
  }) => {
    const feature = resolveFeature(explicitFeature);
    if (!feature) {
      return respond({
        success: false,
        terminal: true,
        error: 'No feature specified. Create a feature or provide feature param.',
        reason: 'feature_required',
        task,
        hints: [
          'Create/select a feature first or pass the feature parameter explicitly.',
          'Use hive_status to inspect the active feature state before retrying.',
        ],
      });
    }

    const blockedMessage = checkBlocked(feature);
    if (blockedMessage) {
      return respond({
        success: false,
        terminal: true,
        error: blockedMessage,
        reason: 'feature_blocked',
        feature,
        task,
        hints: [
          'Wait for the human to unblock the feature before retrying.',
          `If approved, remove .hive/features/${resolveFeatureDirectoryName(directory, feature)}/BLOCKED and retry hive_worktree_create.`,
        ],
      });
    }

    const taskInfo = taskService.get(feature, task);
    if (!taskInfo) {
      return respond({
        success: false,
        terminal: true,
        error: `Task "${task}" not found`,
        reason: 'task_not_found',
        feature,
        task,
        hints: [
          'Check the task folder name in tasks.json or hive_status output.',
          'Run hive_tasks_sync if the approved plan has changed and tasks need regeneration.',
        ],
      });
    }

    if (taskInfo.status === 'done') {
      return respond({
        success: false,
        terminal: true,
        error: `Task "${task}" is already completed (status: done). It cannot be restarted.`,
        currentStatus: 'done',
        hints: [
          'Use hive_merge to integrate the completed task branch if not already merged.',
          'Use hive_status to see all task states and find the next runnable task.',
        ],
      });
    }

    if (continueFrom !== 'blocked') {
      return respond({
        success: false,
        terminal: true,
        error: 'hive_worktree_create is only for resuming blocked tasks.',
        reason: 'blocked_resume_required',
        currentStatus: taskInfo.status,
        feature,
        task,
        hints: [
          'Use hive_worktree_start({ feature, task }) to start a pending or in-progress task normally.',
          'Use hive_worktree_create({ task, continueFrom: "blocked", decision }) only after hive_status confirms the task is blocked.',
        ],
      });
    }

    if (taskInfo.status !== 'blocked') {
      return respond({
        success: false,
        terminal: true,
        error: `continueFrom: 'blocked' was specified but task "${task}" is not in blocked state (current status: ${taskInfo.status}).`,
        currentStatus: taskInfo.status,
        hints: [
          'Use hive_worktree_start({ feature, task }) for normal starts or re-dispatch.',
          'Use hive_status to verify the current task status before retrying.',
        ],
      });
    }

    const worktree = await worktreeService.get(feature, task);
    if (!worktree) {
      return respond({
        success: false,
        terminal: true,
        error: `Cannot resume blocked task "${task}": no existing worktree record found.`,
        currentStatus: taskInfo.status,
        hints: [
          'The worktree may have been removed manually. Use hive_worktree_discard to reset the task to pending, then restart it with hive_worktree_start.',
          'Use hive_status to inspect the current state of the task and its worktree.',
        ],
      });
    }

    return buildWorktreeLaunchResponse({
      feature,
      task,
      taskInfo,
      worktree,
      continueFrom,
      decision,
    });
  };

  return {
    event: async (input) => {
      if (input.event.type !== 'session.compacted') {
        return;
      }

      const sessionID = input.event.properties.sessionID;
      const existing = sessionService.getGlobal(sessionID);
      const directiveReplayPatch = getDirectiveReplayCompactionPatch(existing);
      if (directiveReplayPatch) {
        sessionService.trackGlobal(sessionID, directiveReplayPatch);
        return;
      }
      if (shouldUseWorkerReplay(existing)) {
        sessionService.trackGlobal(sessionID, { replayDirectivePending: true });
        return;
      }
    },

    "experimental.chat.system.transform": async (
      input: { agent?: string } | unknown,
      output: { system: string[] },
    ) => {
      // Cadence gate: check if this hook should execute this turn
      if (!shouldExecuteHook("experimental.chat.system.transform", configService, turnCounters)) {
        return;
      }

      output.system.push(HIVE_SYSTEM_PROMPT);

      // NOTE: autoLoadSkills injection is now done in the config hook (prompt field)
      // to ensure skills are present from the first message. The system.transform hook
      // may not receive the agent name at runtime, so we removed legacy auto-load here.

      const activeFeature = resolveFeature();
      if (activeFeature) {
        const info = featureService.getInfo(activeFeature);
        if (info) {
          const featureInfo = info as typeof info & {
            hasOverview?: boolean;
            reviewCounts?: { plan: number; overview: number };
          };
          let statusHint = `\n### Current Hive Status\n`;
          statusHint += `**Active Feature**: ${info.name} (${info.status})\n`;
          statusHint += `**Progress**: ${info.tasks.filter(t => t.status === 'done').length}/${info.tasks.length} tasks\n`;

          if (featureInfo.hasOverview) {
            statusHint += `**Overview**: available at .hive/features/${resolveFeatureDirectoryName(directory, info.name)}/context/overview.md (primary human-facing doc)\n`;
          } else if (info.hasPlan) {
            statusHint += `**Overview**: missing - write it with hive_context_write({ name: "overview", content })\n`;
          }

          if (info.commentCount > 0) {
            statusHint += `**Comments**: ${info.commentCount} unresolved (plan: ${featureInfo.reviewCounts?.plan ?? 0}, overview: ${featureInfo.reviewCounts?.overview ?? 0})\n`;
          }

          output.system.push(statusHint);
        }
      }
    },

    "experimental.session.compacting": async (
      _input: { sessionID: string },
      output: { context: string[]; prompt?: string },
    ) => {
      const session = sessionService.getGlobal(_input.sessionID);
      if (session) {
        const ctx: CompactionSessionContext = {
          agent: session.agent,
          baseAgent: session.baseAgent,
          sessionKind: session.sessionKind,
          featureName: session.featureName,
          taskFolder: session.taskFolder,
          workerPromptPath: session.workerPromptPath,
          directivePrompt: session.directivePrompt,
        };
        const reanchor = buildCompactionReanchor(ctx);
        output.prompt = reanchor.prompt;
        output.context.push(...reanchor.context);
      } else {
        const reanchor = buildCompactionReanchor({});
        output.prompt = reanchor.prompt;
        output.context.push(...reanchor.context);
      }
    },

    // Apply per-agent variant to messages (covers built-in and accepted custom task() agents)
    // Type assertion needed because TypeScript's contravariance rules are too strict
    // for the hook's output parameter type. The hook only accesses output.message.variant
    // which exists on UserMessage.
    "chat.message": createVariantHook(configService, sessionService, customAgentConfigsForClassification, taskWorkerRecovery) as any,

    "experimental.chat.messages.transform": async (
      _input: {},
      output: { messages: ReplayMessageEntry[] },
    ) => {
      if (!Array.isArray(output.messages) || output.messages.length === 0) {
        return;
      }

      const firstMessage = output.messages[0];
      const sessionID = firstMessage?.info?.sessionID;
      if (!sessionID) {
        return;
      }

      const session = sessionService.getGlobal(sessionID);

      const captureCandidates = output.messages.filter(
        ({ info, parts }) => info.sessionID === sessionID && shouldCaptureDirective(info, parts),
      );
      const latestDirective = captureCandidates.at(-1);
      if (latestDirective) {
        const directiveText = extractTextParts(latestDirective.parts).join('\n\n');
        const existingDirective = session?.directivePrompt;
        if (directiveText && directiveText !== existingDirective && shouldUseDirectiveReplay(session ?? { sessionKind: 'subagent' })) {
          sessionService.trackGlobal(sessionID, {
            directivePrompt: directiveText,
            directiveRecoveryState: undefined,
            replayDirectivePending: false,
          });
        }
      }

      const refreshed = sessionService.getGlobal(sessionID);
      if (!refreshed?.replayDirectivePending) {
        return;
      }

      if (shouldUseWorkerReplay(refreshed)) {
        const workerText = buildWorkerReplayText(refreshed);
        if (!workerText) {
          sessionService.trackGlobal(sessionID, { replayDirectivePending: false });
          return;
        }

        const now = Date.now();
        output.messages.push({
          info: {
            id: `msg_replay_${sessionID}`,
            sessionID,
            role: 'user',
            time: { created: now },
          },
          parts: [
            {
              id: `prt_replay_${sessionID}`,
              sessionID,
              messageID: `msg_replay_${sessionID}`,
              type: 'text',
              text: workerText,
              synthetic: true,
            },
          ],
        });

        sessionService.trackGlobal(sessionID, { replayDirectivePending: false });
        return;
      }

      if (!shouldUseDirectiveReplay(refreshed)) {
        sessionService.trackGlobal(sessionID, { replayDirectivePending: false });
        return;
      }

      const replayText = buildDirectiveReplayText(refreshed);
      if (!replayText) {
        sessionService.trackGlobal(sessionID, { replayDirectivePending: false });
        return;
      }

      const now = Date.now();
      output.messages.push({
        info: {
          id: `msg_replay_${sessionID}`,
          sessionID,
          role: 'user',
          time: { created: now },
        },
        parts: [
          {
            id: `prt_replay_${sessionID}`,
            sessionID,
            messageID: `msg_replay_${sessionID}`,
            type: 'text',
            text: replayText,
            synthetic: true,
          },
        ],
      });

      sessionService.trackGlobal(sessionID, {
        replayDirectivePending: false,
        directiveRecoveryState: refreshed.directiveRecoveryState === 'available'
          ? 'consumed'
          : refreshed.directiveRecoveryState,
      });
    },

    "tool.execute.before": async (input, output) => {
      // Cadence gate: check if this hook should execute this turn
      // SAFETY-CRITICAL: This hook wraps commands for Docker sandbox isolation.
      // Setting cadence > 1 could allow unsafe commands through.
      // The safetyCritical flag enforces cadence=1 regardless of config.
      if (!shouldExecuteHook("tool.execute.before", configService, turnCounters, { safetyCritical: true })) {
        return;
      }

      if (input.tool !== "bash") return;
      
      const sandboxConfig = configService.getSandboxConfig();
      if (sandboxConfig.mode === 'none') return;
      
      const command = output.args?.command?.trim();
      if (!command) return;
      
      // Escape hatch: HOST: prefix (case-insensitive)
      if (/^HOST:\s*/i.test(command)) {
        const strippedCommand = command.replace(/^HOST:\s*/i, '');
        console.warn(`[hive:sandbox] HOST bypass: ${strippedCommand.slice(0, 80)}${strippedCommand.length > 80 ? '...' : ''}`);
        output.args.command = strippedCommand;
        return;
      }
      
      // Only wrap commands with explicit workdir inside hive worktrees
      const workdir = output.args?.workdir;
      if (!workdir) return;
      
      const hiveWorktreeBase = path.join(directory, '.hive', '.worktrees');
      if (!workdir.startsWith(hiveWorktreeBase)) return;
      
      // Wrap command using static method (with persistent config)
      const wrapped = DockerSandboxService.wrapCommand(workdir, command, sandboxConfig);
      output.args.command = wrapped;
      output.args.workdir = undefined; // docker command runs on host
    },

    mcp: builtinMcps,

    tool: {
      hive_skill: createHiveSkillTool(filteredSkills),

      hive_feature_create: tool({
        description: 'Create a new feature and set it as active',
        args: {
          name: tool.schema.string().describe('Feature name'),
          ticket: tool.schema.string().optional().describe('Ticket reference'),
        },
        async execute({ name, ticket }) {
          const feature = featureService.create(name, ticket);
          return `Feature "${name}" created.

## Discovery Phase Required

Before writing a plan, you MUST:
1. Ask clarifying questions about the feature
2. Document Q&A in plan.md with a \`## Discovery\` section
3. Research the codebase (grep, read existing code)
4. Save findings with hive_context_write

Example discovery section:
\`\`\`markdown
## Discovery

**Q: What authentication system do we use?**
A: JWT with refresh tokens, see src/auth/

**Q: Should this work offline?**
A: No, online-only is fine

**Research:**
- Found existing theme system in src/theme/
- Uses CSS variables pattern
\`\`\`

## Planning Guidelines

When writing your plan, include:
- \`## Non-Goals\` - What we're explicitly NOT building (scope boundaries)
- \`## Ghost Diffs\` - Alternatives you considered but rejected

These prevent scope creep and re-proposing rejected solutions.

NEXT: Ask your first clarifying question about this feature.`;
        },
      }),

      hive_feature_complete: tool({
        description: 'Mark feature as completed (irreversible)',
        args: { name: tool.schema.string().optional().describe('Feature name (defaults to active)') },
        async execute({ name }) {
          const feature = resolveFeature(name);
          if (!feature) return "Error: No feature specified. Create a feature or provide name.";
          featureService.complete(feature);
          return `Feature "${feature}" marked as completed`;
        },
      }),

      hive_plan_write: tool({
        description: 'Write plan.md (clears plan review comments)',
        args: {
          content: tool.schema.string().describe('Plan markdown content'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ content, feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          // GATE: Check for discovery section with substantive content
          const discoveryMatch = content.match(/^##\s+Discovery\s*$/im);
          if (!discoveryMatch) {
            return `BLOCKED: Discovery section required before planning.

Your plan must include a \`## Discovery\` section documenting:
- Questions you asked and answers received
- Research findings from codebase exploration
- Key decisions made

Add this section to your plan content and try again.`;
          }
          
          // Extract content between ## Discovery and next ## heading (or end)
          const afterDiscovery = content.slice(discoveryMatch.index! + discoveryMatch[0].length);
          const nextHeading = afterDiscovery.search(/^##\s+/m);
          const discoveryContent = nextHeading > -1
            ? afterDiscovery.slice(0, nextHeading).trim()
            : afterDiscovery.trim();
          
          if (discoveryContent.length < 100) {
            return `BLOCKED: Discovery section is too thin (${discoveryContent.length} chars, minimum 100).

A substantive Discovery section should include:
- Original request quoted
- Interview summary (key decisions)
- Research findings with file:line references

Expand your Discovery section and try again.`;
          }

          captureSession(feature, toolContext);
          const planPath = planService.write(feature, content);
          return `Plan written to ${planPath}. Comments cleared for fresh review. Refresh the primary human-facing overview with hive_context_write({ name: "overview", content }) using ## At a Glance, ## Workstreams, and ## Revision History. Review context/overview.md first; plan.md remains execution truth.`;
        },
      }),

      hive_plan_read: tool({
        description: 'Read plan.md and related review comments',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          captureSession(feature, toolContext);
          bindFeatureSession(feature, toolContext);
          const result = planService.read(feature);
          if (!result) return "Error: No plan.md found";
          return JSON.stringify(result, null, 2);
        },
      }),

      hive_plan_approve: tool({
        description: 'Approve plan for execution',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          captureSession(feature, toolContext);
          const info = featureService.getInfo(feature);
          const planComments = info?.reviewCounts.plan ?? 0;
          const overviewComments = info?.reviewCounts.overview ?? 0;
          const unresolvedTotal = planComments + overviewComments;
          if (unresolvedTotal > 0) {
            const documents = [
              planComments > 0 ? `plan (${planComments})` : null,
              overviewComments > 0 ? `overview (${overviewComments})` : null,
            ].filter(Boolean).join(', ');
            return `Error: Cannot approve - ${unresolvedTotal} unresolved review comment(s) remain across ${documents}. Address them first.`;
          }
          planService.approve(feature);
          return 'Plan approved. Run hive_tasks_sync to generate tasks. Refresh the overview if approval changed the plan narrative, workstreams, or milestones; context/overview.md is the primary human-facing surface and plan.md remains execution truth.';
        },
      }),

      hive_tasks_sync: tool({
        description: 'Generate tasks from approved plan. When refreshPending is true, refresh pending plan tasks from current plan.md and delete removed pending tasks. Manual tasks and tasks with execution history are preserved.',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
          refreshPending: tool.schema.boolean().optional().describe('When true, refresh pending plan tasks from current plan.md (rewrite dependsOn, planTitle, spec.md) and delete pending tasks removed from plan'),
        },
        async execute({ feature: explicitFeature, refreshPending }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          const featureData = featureService.get(feature);
          if (!featureData || featureData.status === 'planning') {
            return "Error: Plan must be approved first";
          }
          const result = taskService.sync(feature, { refreshPending });
          if (featureData.status === 'approved') {
            featureService.updateStatus(feature, 'executing');
          }
          return `Tasks synced: ${result.created.length} created, ${result.removed.length} removed, ${result.kept.length} kept, ${result.manual.length} manual`;
        },
      }),

      hive_task_create: tool({
        description: 'Create manual task (not from plan). Manual tasks always have explicit dependsOn (default: []). Provide structured metadata for useful spec.md and worker prompt.',
        args: {
          name: tool.schema.string().describe('Task name'),
          order: tool.schema.number().optional().describe('Task order'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
          description: tool.schema.string().optional().describe('What the worker needs to achieve'),
          goal: tool.schema.string().optional().describe('Why this task exists and what done means'),
          acceptanceCriteria: tool.schema.array(tool.schema.string()).optional().describe('Specific observable outcomes'),
          references: tool.schema.array(tool.schema.string()).optional().describe('File paths or line ranges relevant to this task'),
          files: tool.schema.array(tool.schema.string()).optional().describe('Files likely to be modified'),
          dependsOn: tool.schema.array(tool.schema.string()).optional().describe('Task folder names this task depends on (default: [] for no dependencies)'),
          reason: tool.schema.string().optional().describe('Why this task was created'),
          source: tool.schema.string().optional().describe('Origin: review, operator, or ad_hoc'),
        },
        async execute({ name, order, feature: explicitFeature, description, goal, acceptanceCriteria, references, files, dependsOn, reason, source }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          const metadata: Record<string, unknown> = {};
          if (description) metadata.description = description;
          if (goal) metadata.goal = goal;
          if (acceptanceCriteria) metadata.acceptanceCriteria = acceptanceCriteria;
          if (references) metadata.references = references;
          if (files) metadata.files = files;
          if (dependsOn) metadata.dependsOn = dependsOn;
          if (reason) metadata.reason = reason;
          if (source) metadata.source = source;
          const folder = taskService.create(feature, name, order, Object.keys(metadata).length > 0 ? metadata as any : undefined);
          return `Manual task created: ${folder}\nDependencies: [${(dependsOn ?? []).join(', ')}]\nReminder: start work with hive_worktree_start to use its worktree, and ensure any subagents work in that worktree too.`;
        },
      }),

      hive_task_update: tool({
        description: 'Update task status or summary',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          status: tool.schema.string().optional().describe('New status: pending, in_progress, done, cancelled'),
          summary: tool.schema.string().optional().describe('Summary of work'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, status, summary, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          const updated = taskService.update(feature, task, {
            status: status as any,
            summary,
          });
          return `Task "${task}" updated: status=${updated.status}`;
        },
      }),

      hive_worktree_start: tool({
        description: 'Create worktree and begin work on pending/in-progress task. Spawns Forager worker automatically.',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, feature: explicitFeature }) {
          return executeWorktreeStart({ task, feature: explicitFeature });
        },
      }),

      hive_worktree_create: tool({
        description: 'Resume a blocked task in its existing worktree. Spawns Forager worker automatically.',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
          continueFrom: tool.schema.enum(['blocked']).optional().describe('Resume a blocked task'),
          decision: tool.schema.string().optional().describe('Answer to blocker question when continuing'),
        },
        async execute({ task, feature: explicitFeature, continueFrom, decision }) {
          return executeBlockedResume({ task, feature: explicitFeature, continueFrom, decision });
        },
      }),

      hive_worktree_commit: tool({
        description: 'Complete task: commit changes to branch, write report. Supports blocked/failed/partial status for worker communication. Returns JSON with ok/terminal semantics for worker control flow.',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          summary: tool.schema.string().describe('Summary of what was done'),
          message: tool.schema.string().optional().describe('Optional git commit message. Empty uses default.'),
          status: tool.schema.enum(['completed', 'blocked', 'failed', 'partial']).optional().default('completed').describe('Task completion status'),
          blocker: tool.schema.object({
            reason: tool.schema.string().describe('Why the task is blocked'),
            options: tool.schema.array(tool.schema.string()).optional().describe('Available options for the user'),
            recommendation: tool.schema.string().optional().describe('Your recommended choice'),
            context: tool.schema.string().optional().describe('Additional context for the decision'),
          }).optional().describe('Blocker info when status is blocked'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, summary, message, status = 'completed', blocker, feature: explicitFeature }, toolContext) {
          const respond = (payload: Record<string, unknown>) => JSON.stringify(payload, null, 2);
          const feature = resolveFeature(explicitFeature);
          if (!feature) {
            return respond({
              ok: false,
              terminal: false,
              status: 'error',
              reason: 'feature_required',
              task,
              taskState: 'unknown',
              message: 'No feature specified. Create a feature or provide feature param.',
              nextAction: 'Provide feature explicitly or create/select an active feature, then retry hive_worktree_commit.',
            });
          }

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) {
            return respond({
              ok: false,
              terminal: false,
              status: 'error',
              reason: 'task_not_found',
              feature,
              task,
              taskState: 'unknown',
              message: `Task "${task}" not found`,
              nextAction: 'Check the task folder name in your worker-prompt.md and retry hive_worktree_commit with the correct task id.',
            });
          }
          if (taskInfo.status !== 'in_progress' && taskInfo.status !== 'blocked') {
            return respond({
              ok: false,
              terminal: false,
              status: 'error',
              reason: 'invalid_task_state',
              feature,
              task,
              taskState: taskInfo.status,
              message: 'Task not in progress',
              nextAction: 'Only in_progress or blocked tasks can be committed. Start/resume the task first.',
            });
          }

          const featureDir = resolveFeatureDirectoryName(directory, feature);
          const workerPromptPath = path.posix.join('.hive', 'features', featureDir, 'tasks', task, 'worker-prompt.md');
          bindFeatureSession(feature, toolContext, { taskFolder: task, workerPromptPath });

          // ADVISORY: Track verification status (workers do best-effort)
          let verificationNote: string | undefined;
          if (status === 'completed') {
            const verificationKeywords = ['test', 'build', 'lint', 'vitest', 'jest', 'npm run', 'pnpm', 'cargo', 'pytest', 'verified', 'passes', 'succeeds', 'ast-grep', 'scan'];
            const summaryLower = summary.toLowerCase();
            const hasVerificationMention = verificationKeywords.some(kw => summaryLower.includes(kw));

            if (!hasVerificationMention) {
              verificationNote = 'No verification evidence in summary. Orchestrator should run build+test after merge.';
            }
          }

          // Handle blocked status - don't commit, just update status
          if (status === 'blocked') {
            taskService.update(feature, task, {
              status: 'blocked',
              summary,
              blocker: blocker as any,
            } as any);

            const worktree = await worktreeService.get(feature, task);
            return respond({
              ok: true,
              terminal: true,
              status: 'blocked',
              reason: 'user_decision_required',
              feature,
              task,
              taskState: 'blocked',
              summary,
              blocker,
              worktreePath: worktree?.path,
              branch: worktree?.branch,
              message: 'Task blocked. Hive Master will ask user and resume with hive_worktree_create(continueFrom: "blocked", decision: answer)',
              nextAction: 'Wait for orchestrator to collect user decision and resume with continueFrom: "blocked".',
            });
          }

          // For failed/partial, still commit what we have
          const commitMessage = message || `hive(${task}): ${summary.slice(0, 50)}`;
          const commitResult = await worktreeService.commitChanges(feature, task, commitMessage);

          if (status === 'completed' && !commitResult.committed && commitResult.message !== 'No changes to commit') {
            return respond({
              ok: false,
              terminal: false,
              status: 'rejected',
              reason: 'commit_failed',
              feature,
              task,
              taskState: taskInfo.status,
              summary,
              commit: {
                committed: commitResult.committed,
                sha: commitResult.sha,
                message: commitResult.message,
              },
              message: `Commit failed: ${commitResult.message || 'unknown error'}`,
              nextAction: 'Resolve git/worktree issue, then call hive_worktree_commit again.',
            });
          }

          const diff = await worktreeService.getDiff(feature, task);

          const statusLabel = status === 'completed' ? 'success' : status;
          const reportLines: string[] = [
            `# Task Report: ${task}`,
            '',
            `**Feature:** ${feature}`,
            `**Completed:** ${new Date().toISOString()}`,
            `**Status:** ${statusLabel}`,
            `**Commit:** ${commitResult.sha || 'none'}`,
            '',
            '---',
            '',
            '## Summary',
            '',
            summary,
            '',
          ];

          if (diff?.hasDiff) {
            reportLines.push(
              '---',
              '',
              '## Changes',
              '',
              `- **Files changed:** ${diff.filesChanged.length}`,
              `- **Insertions:** +${diff.insertions}`,
              `- **Deletions:** -${diff.deletions}`,
              '',
            );

            if (diff.filesChanged.length > 0) {
              reportLines.push('### Files Modified', '');
              for (const file of diff.filesChanged) {
                reportLines.push(`- \`${file}\``);
              }
              reportLines.push('');
            }
          } else {
            reportLines.push('---', '', '## Changes', '', '_No file changes detected_', '');
          }

          const reportPath = taskService.writeReport(feature, task, reportLines.join('\n'));

          const finalStatus = status === 'completed' ? 'done' : status;
          taskService.update(feature, task, { status: finalStatus as any, summary });

          const worktree = await worktreeService.get(feature, task);
          return respond({
            ok: true,
            terminal: true,
            status,
            feature,
            task,
            taskState: finalStatus,
            summary,
            ...(verificationNote && { verificationNote }),
            commit: {
              committed: commitResult.committed,
              sha: commitResult.sha,
              message: commitResult.message,
            },
            worktreePath: worktree?.path,
            branch: worktree?.branch,
            reportPath,
            message: `Task "${task}" ${status}.`,
            nextAction: 'Use hive_merge to integrate changes. Worktree is preserved for review.',
          });
        },
      }),

      hive_worktree_discard: tool({
        description: 'Abort task: discard changes, reset status',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          await worktreeService.remove(feature, task);
          taskService.update(feature, task, { status: 'pending' });

          return `Task "${task}" aborted. Status reset to pending.`;
        },
      }),


      hive_merge: tool({
        description: 'Merge completed task branch into current branch (explicit integration)',
        args: {
          task: tool.schema.string().describe('Task folder name to merge'),
          strategy: tool.schema.enum(['merge', 'squash', 'rebase']).optional().describe('Merge strategy (default: merge)'),
          message: tool.schema.string().optional().describe('Optional merge message for merge/squash. Empty uses default.'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, strategy = 'merge', message, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) return `Error: Task "${task}" not found`;
          if (taskInfo.status !== 'done') return "Error: Task must be completed before merging. Use hive_worktree_commit first.";

          const result = await worktreeService.merge(feature, task, strategy, message);

          if (!result.success) {
            if (result.conflicts && result.conflicts.length > 0) {
              return `Merge failed with conflicts in:\n${result.conflicts.map(f => `- ${f}`).join('\n')}\n\nResolve conflicts manually or try a different strategy.`;
            }
            return `Merge failed: ${result.error}`;
          }

          return `Task "${task}" merged successfully using ${strategy} strategy.\nCommit: ${result.sha}\nFiles changed: ${result.filesChanged?.length || 0}`;
        },
      }),

      // Context Tools
      hive_context_write: tool({
        description: 'Write a context file for the feature. Context files store persistent notes, decisions, and reference material.',
        args: {
          name: tool.schema.string().describe('Context file name (e.g., "decisions", "architecture", "notes")'),
          content: tool.schema.string().describe('Markdown content to write'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ name, content, feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          bindFeatureSession(feature, toolContext);
          const filePath = contextService.write(feature, name, content);
          return `Context file written: ${filePath}`;
        },
      }),

      // Status Tool
      hive_status: tool({
        description: 'Get comprehensive status of a feature including plan, tasks, and context. Returns JSON with all relevant state for resuming work.',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ feature: explicitFeature }) {
          const respond = (payload: Record<string, unknown>) => JSON.stringify(payload, null, 2);
          const feature = resolveFeature(explicitFeature);
          if (!feature) {
            return respond({
              success: false,
              terminal: true,
              reason: 'feature_required',
              error: 'No feature specified and no active feature found',
              hint: 'Use hive_feature_create to create a new feature',
            });
          }

          const featureData = featureService.get(feature);
          if (!featureData) {
            return respond({
              success: false,
              terminal: true,
              reason: 'feature_not_found',
              error: `Feature '${feature}' not found`,
              availableFeatures: featureService.list(),
            });
          }

          const blocked = checkBlocked(feature);
          if (blocked) {
            return respond({
              success: false,
              terminal: true,
              blocked: true,
              error: blocked,
              hints: [
                'Read the blocker details and resolve them before retrying hive_status.',
                `Remove .hive/features/${resolveFeatureDirectoryName(directory, feature)}/BLOCKED once the blocker is resolved.`,
              ],
            });
          }

          const plan = planService.read(feature);
          const tasks = taskService.list(feature);
          const contextFiles = contextService.list(feature);
          const overview = contextFiles.find(file => file.name === 'overview') ?? null;
          const readThreads = (filePath: string): Array<unknown> | null => {
            if (!fs.existsSync(filePath)) {
              return null;
            }

            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { threads?: Array<unknown> };
              return data.threads ?? [];
            } catch {
              return [];
            }
          };
          const featurePath = path.join(directory, '.hive', 'features', resolveFeatureDirectoryName(directory, feature));
          const reviewDir = path.join(featurePath, 'comments');
          const planThreads = readThreads(path.join(reviewDir, 'plan.json')) ?? readThreads(path.join(featurePath, 'comments.json'));
          const overviewThreads = readThreads(path.join(reviewDir, 'overview.json'));
          const reviewCounts = {
            plan: planThreads?.length ?? 0,
            overview: overviewThreads?.length ?? 0,
          };

          const tasksSummary = await Promise.all(tasks.map(async t => {
            const rawStatus = taskService.getRawStatus(feature, t.folder);
            const worktree = await worktreeService.get(feature, t.folder);
            const hasChanges = worktree
              ? await worktreeService.hasUncommittedChanges(worktree.feature, worktree.step)
              : null;

            return {
              folder: t.folder,
              name: t.name,
              status: t.status,
              origin: t.origin || 'plan',
              dependsOn: rawStatus?.dependsOn ?? null,
              worktree: worktree ? {
                branch: worktree.branch,
                hasChanges,
              } : null,
            };
          }));

          const contextSummary = contextFiles.map(c => ({
            name: c.name,
            chars: c.content.length,
            updatedAt: c.updatedAt,
          }));

          const pendingTasks = tasksSummary.filter(t => t.status === 'pending');
          const inProgressTasks = tasksSummary.filter(t => t.status === 'in_progress');
          const doneTasks = tasksSummary.filter(t => t.status === 'done');

          const tasksWithDeps = tasksSummary.map(t => ({
            folder: t.folder,
            status: t.status,
            dependsOn: t.dependsOn ?? undefined,
          }));
          const effectiveDeps = buildEffectiveDependencies(tasksWithDeps);
          const normalizedTasks = tasksWithDeps.map(task => ({
            ...task,
            dependsOn: effectiveDeps.get(task.folder),
          }));
          const { runnable, blocked: blockedBy } = computeRunnableAndBlocked(normalizedTasks);

          const getNextAction = (
            planStatus: string | null,
            tasks: Array<{ status: string; folder: string }>,
            runnableTasks: string[],
            hasPlan: boolean,
            hasOverview: boolean,
          ): string => {
            if (planStatus === 'review') {
              return 'Wait for plan approval or revise based on comments';
            }
            if (!hasPlan || planStatus === 'draft') {
              return 'Write or revise plan with hive_plan_write. Keep plan.md as the human-facing review artifact; pre-task Mermaid overview diagrams are optional.';
            }
            if (tasks.length === 0) {
              return 'Generate tasks from plan with hive_tasks_sync';
            }
            const inProgress = tasks.find(t => t.status === 'in_progress');
            if (inProgress) {
              return `Continue work on task: ${inProgress.folder}`;
            }
            if (runnableTasks.length > 1) {
              return `${runnableTasks.length} tasks are ready to start in parallel: ${runnableTasks.join(', ')}`;
            }
            if (runnableTasks.length === 1) {
              return `Start next task with hive_worktree_start: ${runnableTasks[0]}`;
            }
            const pending = tasks.find(t => t.status === 'pending');
            if (pending) {
              return `Pending tasks exist but are blocked by dependencies. Check blockedBy for details.`;
            }
            return 'All tasks complete. Review and merge or complete feature.';
          };

          const planStatus = featureData.status === 'planning' ? 'draft' :
            featureData.status === 'approved' ? 'approved' :
              featureData.status === 'executing' ? 'locked' : 'none';

          return respond({
            feature: {
              name: feature,
              status: featureData.status,
              ticket: featureData.ticket || null,
              createdAt: featureData.createdAt,
            },
            plan: {
              exists: !!plan,
              status: planStatus,
              approved: planStatus === 'approved' || planStatus === 'locked',
            },
            overview: {
              exists: !!overview,
              path: `.hive/features/${feature}/context/overview.md`,
              updatedAt: overview?.updatedAt ?? null,
            },
            review: {
              unresolvedTotal: reviewCounts.plan + reviewCounts.overview,
              byDocument: {
                overview: reviewCounts.overview,
                plan: reviewCounts.plan,
              },
            },
            tasks: {
              total: tasks.length,
              pending: pendingTasks.length,
              inProgress: inProgressTasks.length,
              done: doneTasks.length,
              list: tasksSummary,
              runnable,
              blockedBy,
            },
            context: {
              fileCount: contextFiles.length,
              files: contextSummary,
            },
            nextAction: getNextAction(planStatus, tasksSummary, runnable, !!plan, !!overview),
          });
        },
      }),

      // AGENTS.md Tool
      hive_agents_md: tool({
        description: 'Initialize or sync AGENTS.md. init: scan codebase and generate (preview only). sync: propose updates from feature contexts. apply: write approved content to disk.',
        args: {
          action: tool.schema.enum(['init', 'sync', 'apply']).describe('Action to perform'),
          feature: tool.schema.string().optional().describe('Feature name for sync action'),
          content: tool.schema.string().optional().describe('Content to write (required for apply action)'),
        },
        async execute({ action, feature, content }) {
          if (action === 'init') {
            const result = await agentsMdService.init();
            if (result.existed) {
              return `AGENTS.md already exists (${result.content.length} chars). Use 'sync' to propose updates.`;
            }
            // P2 gate: Return content for review — ask user via question() before writing
            return `Generated AGENTS.md from codebase scan (${result.content.length} chars):\n\n${result.content}\n\n⚠️ This has NOT been written to disk. Ask the user via question() whether to write it to AGENTS.md.`;
          }

          if (action === 'sync') {
            if (!feature) return 'Error: feature name required for sync action';
            const result = await agentsMdService.sync(feature);
            if (result.proposals.length === 0) {
              return 'No new findings to sync to AGENTS.md.';
            }
            // P2 gate: Return diff for review — never auto-apply
            return `Proposed AGENTS.md updates from feature "${feature}":\n\n${result.diff}\n\n⚠️ These changes have NOT been applied. Ask the user via question() whether to apply them.`;
          }

          if (action === 'apply') {
            if (!content) return 'Error: content required for apply action. Use init or sync first to get content, then apply with the approved content.';
            const result = agentsMdService.apply(content);
            return `AGENTS.md ${result.isNew ? 'created' : 'updated'} (${result.chars} chars) at ${result.path}`;
          }

          return 'Error: unknown action';
        },
      }),

    },

    command: {
      hive: {
        description: "Create a new feature: /hive <feature-name>",
        async run(args: string) {
          const name = args.trim();
          if (!name) return "Usage: /hive <feature-name>";
          return `Create feature "${name}" using hive_feature_create tool.`;
        },
      },
    },

    // Config hook - merge agents into opencodeConfig.agent
    config: async (opencodeConfig: Record<string, unknown>) => {
      function agentTools(allowed: string[]): Record<string, boolean> {
        const allHiveTools = [
          'hive_feature_create', 'hive_feature_complete',
          'hive_plan_write', 'hive_plan_read', 'hive_plan_approve',
          'hive_tasks_sync', 'hive_task_create', 'hive_task_update',
          'hive_worktree_start', 'hive_worktree_create', 'hive_worktree_commit', 'hive_worktree_discard',
          'hive_merge', 'hive_context_write', 'hive_status', 'hive_skill', 'hive_agents_md',
        ];
        const result: Record<string, boolean> = {};
        for (const tool of allHiveTools) {
          if (!allowed.includes(tool)) {
            result[tool] = false;
          }
        }
        return result;
      }
      // Auto-generate config file with defaults if it doesn't exist
      configService.init();
      const hiveConfigData = configService.get();
      const agentMode = hiveConfigData.agentMode ?? 'unified';

      const customAgentConfigs = getCustomAgentConfigsCompat(configService);
      const customSubagentAppendix = Object.keys(customAgentConfigs).length === 0
        ? ''
        : `\n\n## Configured Custom Subagents\n${Object.entries(customAgentConfigs)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, config]) => `- \`${name}\` — derived from \`${config.baseAgent}\`; ${config.description}`)
          .join('\n')}`;

      // Build auto-loaded skill content for each agent
      const hiveUserConfig = configService.getAgentConfig('hive-master');
      const hiveAutoLoadedSkills = await buildAutoLoadedSkillsContent('hive-master', configService, directory);
      const hiveConfig = {
        model: hiveUserConfig.model,
        variant: hiveUserConfig.variant,
        temperature: hiveUserConfig.temperature ?? 0.5,
        description: 'Hive (Hybrid) - Plans + orchestrates. Detects phase, loads skills on-demand.',
        prompt: QUEEN_BEE_PROMPT + hiveAutoLoadedSkills + (agentMode === 'unified' ? customSubagentAppendix : ''),
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
        },
      };

      const architectUserConfig = configService.getAgentConfig('architect-planner');
      const architectAutoLoadedSkills = await buildAutoLoadedSkillsContent('architect-planner', configService, directory);
      const architectConfig = {
        model: architectUserConfig.model,
        variant: architectUserConfig.variant,
        temperature: architectUserConfig.temperature ?? 0.7,
        description: 'Architect (Planner) - Plans features, interviews, writes plans. NEVER executes.',
        prompt: ARCHITECT_BEE_PROMPT + architectAutoLoadedSkills + (agentMode === 'dedicated' ? customSubagentAppendix : ''),
        tools: agentTools(['hive_feature_create', 'hive_plan_write', 'hive_plan_read', 'hive_context_write', 'hive_status', 'hive_skill']),
        permission: {
          edit: "deny",  // Planners don't edit code
          task: "allow",
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          webfetch: "allow",
        },
      };

      const swarmUserConfig = configService.getAgentConfig('swarm-orchestrator');
      const swarmAutoLoadedSkills = await buildAutoLoadedSkillsContent('swarm-orchestrator', configService, directory);
      const swarmConfig = {
        model: swarmUserConfig.model,
        variant: swarmUserConfig.variant,
        temperature: swarmUserConfig.temperature ?? 0.5,
        description: 'Swarm (Orchestrator) - Orchestrates execution. Delegates, spawns workers, verifies, merges.',
        prompt: SWARM_BEE_PROMPT + swarmAutoLoadedSkills + (agentMode === 'dedicated' ? customSubagentAppendix : ''),
        tools: agentTools([
          'hive_feature_create', 'hive_feature_complete', 'hive_plan_read', 'hive_plan_approve',
          'hive_tasks_sync', 'hive_task_create', 'hive_task_update',
          'hive_worktree_start', 'hive_worktree_create', 'hive_worktree_discard', 'hive_merge',
          'hive_context_write', 'hive_status', 'hive_skill', 'hive_agents_md',
        ]),
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
        },
      };

      const scoutUserConfig = configService.getAgentConfig('scout-researcher');
      const scoutAutoLoadedSkills = await buildAutoLoadedSkillsContent('scout-researcher', configService, directory);
      const scoutConfig = {
        model: scoutUserConfig.model,
        variant: scoutUserConfig.variant,
        temperature: scoutUserConfig.temperature ?? 0.5,
        mode: 'subagent' as const,
        description: 'Scout (Explorer/Researcher/Retrieval) - Researches codebase + external docs/data.',
        prompt: SCOUT_BEE_PROMPT + scoutAutoLoadedSkills,
        tools: agentTools(['hive_plan_read', 'hive_context_write', 'hive_status', 'hive_skill']),
        permission: {
          edit: "deny",  // Researchers don't edit code
          task: "deny",
          delegate: "deny",
          skill: "allow",
          webfetch: "allow",
        },
      };

      const foragerUserConfig = configService.getAgentConfig('forager-worker');
      const foragerAutoLoadedSkills = await buildAutoLoadedSkillsContent('forager-worker', configService, directory);
      const foragerConfig = {
        model: foragerUserConfig.model,
        variant: foragerUserConfig.variant,
        temperature: foragerUserConfig.temperature ?? 0.3,
        mode: 'subagent' as const,
        description: 'Forager (Worker/Coder) - Executes tasks directly in isolated worktrees. Never delegates.',
        prompt: FORAGER_BEE_PROMPT + foragerAutoLoadedSkills,
        tools: agentTools(['hive_plan_read', 'hive_worktree_commit', 'hive_context_write', 'hive_skill']),
        permission: {
          task: "deny",
          delegate: "deny",
          skill: "allow",
        },
      };

      const hygienicUserConfig = configService.getAgentConfig('hygienic-reviewer');
      const hygienicAutoLoadedSkills = await buildAutoLoadedSkillsContent('hygienic-reviewer', configService, directory);
      const hygienicConfig = {
        model: hygienicUserConfig.model,
        variant: hygienicUserConfig.variant,
        temperature: hygienicUserConfig.temperature ?? 0.3,
        mode: 'subagent' as const,
        description: 'Hygienic (Consultant/Reviewer/Debugger) - Reviews plan documentation quality. OKAY/REJECT verdict.',
        prompt: HYGIENIC_BEE_PROMPT + hygienicAutoLoadedSkills,
        tools: agentTools(['hive_plan_read', 'hive_context_write', 'hive_status', 'hive_skill']),
        permission: {
          edit: "deny",  // Reviewers don't edit
          task: "deny",
          delegate: "deny",
          skill: "allow",
        },
      };

      const builtInAgentConfigs = {
        'hive-master': hiveConfig,
        'architect-planner': architectConfig,
        'swarm-orchestrator': swarmConfig,
        'scout-researcher': scoutConfig,
        'forager-worker': foragerConfig,
        'hygienic-reviewer': hygienicConfig,
      };

      const customAutoLoadedSkills = Object.fromEntries(
        await Promise.all(
          Object.entries(customAgentConfigs).map(async ([customAgentName, customAgentConfig]) => {
            const inheritedBaseSkills = customAgentConfig.baseAgent === 'forager-worker'
              ? (foragerUserConfig.autoLoadSkills ?? [])
              : (hygienicUserConfig.autoLoadSkills ?? []);
            const deltaAutoLoadSkills = (customAgentConfig.autoLoadSkills ?? []).filter(
              (skill) => !inheritedBaseSkills.includes(skill),
            );

            return [
              customAgentName,
              await buildAutoLoadedSkillsContent(customAgentName, configService, directory, deltaAutoLoadSkills),
            ];
          }),
        ),
      );

      const customSubagents = buildCustomSubagents({
        customAgents: customAgentConfigs,
        baseAgents: {
          'forager-worker': foragerConfig,
          'hygienic-reviewer': hygienicConfig,
        },
        autoLoadedSkills: customAutoLoadedSkills,
      });

      // Build agents map based on agentMode
      const allAgents: Record<string, unknown> = {};
      
      if (agentMode === 'unified') {
        allAgents['hive-master'] = builtInAgentConfigs['hive-master'];
        allAgents['scout-researcher'] = builtInAgentConfigs['scout-researcher'];
        allAgents['forager-worker'] = builtInAgentConfigs['forager-worker'];
        allAgents['hygienic-reviewer'] = builtInAgentConfigs['hygienic-reviewer'];
      } else {
        allAgents['architect-planner'] = builtInAgentConfigs['architect-planner'];
        allAgents['swarm-orchestrator'] = builtInAgentConfigs['swarm-orchestrator'];
        allAgents['scout-researcher'] = builtInAgentConfigs['scout-researcher'];
        allAgents['forager-worker'] = builtInAgentConfigs['forager-worker'];
        allAgents['hygienic-reviewer'] = builtInAgentConfigs['hygienic-reviewer'];
      }

      Object.assign(allAgents, customSubagents);

      // Merge agents into opencodeConfig.agent (config hook is sufficient for agent discovery)
      const configAgent = opencodeConfig.agent as Record<string, unknown> | undefined;
      if (!configAgent) {
        opencodeConfig.agent = allAgents;
      } else {
        // Clean up old single-word agent names
        delete (configAgent as Record<string, unknown>).hive;
        delete (configAgent as Record<string, unknown>).architect;
        delete (configAgent as Record<string, unknown>).swarm;
        delete (configAgent as Record<string, unknown>).scout;
        delete (configAgent as Record<string, unknown>).forager;
        delete (configAgent as Record<string, unknown>).hygienic;
        delete (configAgent as Record<string, unknown>).receiver;
        // Clean up old kebab-case names (in case they exist)
        delete (configAgent as Record<string, unknown>)['hive-master'];
        delete (configAgent as Record<string, unknown>)['architect-planner'];
        delete (configAgent as Record<string, unknown>)['swarm-orchestrator'];
        delete (configAgent as Record<string, unknown>)['scout-researcher'];
        delete (configAgent as Record<string, unknown>)['forager-worker'];
        delete (configAgent as Record<string, unknown>)['hygienic-reviewer'];
        Object.assign(configAgent, allAgents);
      }

      // Set default agent based on mode
      (opencodeConfig as Record<string, unknown>).default_agent = 
        agentMode === 'unified' ? 'hive-master' : 'architect-planner';

      // Merge built-in MCP servers (OMO-style remote endpoints)
      const configMcp = opencodeConfig.mcp as Record<string, unknown> | undefined;
      if (!configMcp) {
        opencodeConfig.mcp = builtinMcps;
      } else {
        Object.assign(configMcp, builtinMcps);
      }

    },
  };
};

export default plugin;
