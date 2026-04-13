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

function initServices() {
  const directory = process.cwd();
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

export function getServices() {
  if (!_services) {
    _services = initServices();
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
