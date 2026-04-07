export type OpenCodeTodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type OpenCodeTodoPriority = 'high' | 'medium' | 'low';

export interface OpenCodeTodoItem {
  id: string;
  content: string;
  status: OpenCodeTodoStatus;
  priority: OpenCodeTodoPriority;
}

export interface TodoProjectionTask {
  folder: string;
  name: string;
  planTitle?: string;
  status: string;
  origin?: string;
  dependsOn?: string[] | null;
  worktree?: {
    branch: string;
    hasChanges: boolean | null;
  } | null;
}

export interface TodoProjectionInput {
  feature: {
    name: string;
    status: string;
  };
  plan: {
    exists: boolean;
    status: string | null;
    approved: boolean;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    list: TodoProjectionTask[];
    runnable: string[];
    blockedBy: Record<string, string[]>;
  };
}

export interface TodoProjection {
  managedBy: 'opencode-hive';
  scope: 'opencode-hive-only';
  managedIdPrefix: string;
  managedIds: string[];
  items: OpenCodeTodoItem[];
  sync: {
    strategy: 'replace-managed-preserve-external';
    preserveNonHiveTodos: true;
    requiresTodoRead: true;
    readTool: 'todoread';
    writeTool: 'todowrite';
    mergeAlgorithm: 'preserve-non-hive-and-replace-managed';
  };
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function taskTitle(task: TodoProjectionTask): string {
  return task.planTitle?.trim() || titleCase(task.name || task.folder.replace(/^\d+-/, ''));
}

function featureTodo(featureName: string, input: TodoProjectionInput): OpenCodeTodoItem {
  if (input.feature.status === 'completed') {
    return {
      id: `hive:${featureName}:feature`,
      content: `${featureName} is complete`,
      status: 'completed',
      priority: 'low',
    };
  }

  if (!input.plan.exists || input.plan.status === 'draft') {
    return {
      id: `hive:${featureName}:feature`,
      content: `Finish the plan for ${featureName}`,
      status: 'pending',
      priority: 'high',
    };
  }

  if (input.tasks.total === 0) {
    return {
      id: `hive:${featureName}:feature`,
      content: `Generate the task list for ${featureName}`,
      status: 'pending',
      priority: 'high',
    };
  }

  if (input.tasks.done === input.tasks.total) {
    return {
      id: `hive:${featureName}:feature`,
      content: `Review and complete ${featureName}`,
      status: 'pending',
      priority: 'medium',
    };
  }

  return {
    id: `hive:${featureName}:feature`,
    content: `Keep ${featureName} moving`,
    status: 'in_progress',
    priority: 'medium',
  };
}

function taskTodo(featureName: string, task: TodoProjectionTask, input: TodoProjectionInput): OpenCodeTodoItem {
  const title = taskTitle(task);
  const blockedDependencies = input.tasks.blockedBy[task.folder] ?? [];
  const runnable = input.tasks.runnable.includes(task.folder);

  switch (task.status) {
    case 'done':
      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: title,
        status: 'completed',
        priority: 'low',
      };
    case 'in_progress':
      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: `Continue ${title}`,
        status: 'in_progress',
        priority: 'high',
      };
    case 'blocked':
      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: `Resolve blocker for ${title}`,
        status: 'pending',
        priority: 'medium',
      };
    case 'failed':
      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: `Fix ${title}`,
        status: 'pending',
        priority: 'high',
      };
    case 'partial':
      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: `Continue ${title}`,
        status: 'in_progress',
        priority: 'medium',
      };
    case 'cancelled':
      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: title,
        status: 'cancelled',
        priority: 'low',
      };
    case 'pending':
    default:
      if (runnable) {
        return {
          id: `hive:${featureName}:task:${task.folder}`,
          content: `Start ${title}`,
          status: 'pending',
          priority: 'high',
        };
      }

      if (blockedDependencies.length > 0) {
        return {
          id: `hive:${featureName}:task:${task.folder}`,
          content: `Resolve blocker for ${title}`,
          status: 'pending',
          priority: 'medium',
        };
      }

      return {
        id: `hive:${featureName}:task:${task.folder}`,
        content: title,
        status: 'pending',
        priority: 'medium',
      };
  }
}

export function buildTodoProjection(input: TodoProjectionInput): TodoProjection {
  const managedIdPrefix = `hive:${input.feature.name}:`;
  const items: OpenCodeTodoItem[] = [
    featureTodo(input.feature.name, input),
    ...input.tasks.list.map(task => taskTodo(input.feature.name, task, input)),
  ];

  return {
    managedBy: 'opencode-hive',
    scope: 'opencode-hive-only',
    managedIdPrefix,
    managedIds: items.map(item => item.id),
    items,
    sync: {
      strategy: 'replace-managed-preserve-external',
      preserveNonHiveTodos: true,
      requiresTodoRead: true,
      readTool: 'todoread',
      writeTool: 'todowrite',
      mergeAlgorithm: 'preserve-non-hive-and-replace-managed',
    },
  };
}

export function mergeTodoProjection(existingTodos: OpenCodeTodoItem[], projection: TodoProjection): OpenCodeTodoItem[] {
  const preservedTodos = existingTodos.filter(todo => !todo.id.startsWith(projection.managedIdPrefix));
  return [...preservedTodos, ...projection.items];
}
