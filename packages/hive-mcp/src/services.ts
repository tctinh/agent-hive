import * as path from 'path';
import {
  FeatureService,
  PlanService,
  TaskService,
  ContextService,
  NetworkService,
  ConfigService,
  AgentsMdService,
  SessionService,
  WorktreeService,
  createWorktreeService,
  detectContext,
  resolveFeatureDirectoryName,
  buildEffectiveDependencies,
  computeRunnableAndBlocked,
} from 'hive-core';

let _services: ReturnType<typeof initServices> | null = null;
let _rootDir: string | null = null;

function initServices(directory: string) {
  const featureService = new FeatureService(directory);
  const planService = new PlanService(directory);
  const taskService = new TaskService(directory);
  const contextService = new ContextService(directory);
  const networkService = new NetworkService(directory);
  const configService = new ConfigService(directory);
  const sessionService = new SessionService(directory);
  const agentsMdService = new AgentsMdService(directory, contextService);
  const worktreeService = new WorktreeService({
    baseDir: directory,
    hiveDir: path.join(directory, '.hive'),
  });

  return {
    directory,
    featureService,
    planService,
    taskService,
    contextService,
    networkService,
    configService,
    sessionService,
    agentsMdService,
    worktreeService,
  };
}

export function getServices(directory?: string) {
  const resolvedDirectory = directory ?? _rootDir ?? process.env.HIVE_PROJECT_ROOT;

  if (!resolvedDirectory) {
    throw new Error('Hive MCP root directory is not configured. Pass rootDir from the entrypoint or set HIVE_PROJECT_ROOT.');
  }

  if (!_services || _rootDir !== resolvedDirectory) {
    _rootDir = resolvedDirectory;
    _services = initServices(resolvedDirectory);
  }
  return _services;
}

export function resolveFeature(services: ReturnType<typeof getServices>, explicit?: string): string | null {
  if (explicit) return explicit;
  const context = detectContext(services.directory);
  if (context.feature) return context.feature;
  return services.featureService.getActive()?.name ?? null;
}

export { resolveFeatureDirectoryName, buildEffectiveDependencies, computeRunnableAndBlocked };
