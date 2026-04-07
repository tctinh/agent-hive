import { describe, expect, it } from 'bun:test';
import { buildTodoProjection, mergeTodoProjection, type TodoProjectionInput } from './todo-projection.js';

function createInput(overrides: Partial<TodoProjectionInput> = {}): TodoProjectionInput {
  return {
    feature: {
      name: 'todo-feature',
      status: 'planning',
    },
    plan: {
      exists: false,
      status: 'draft',
      approved: false,
    },
    tasks: {
      total: 0,
      pending: 0,
      inProgress: 0,
      done: 0,
      list: [],
      runnable: [],
      blockedBy: {},
    },
    ...overrides,
  };
}

describe('buildTodoProjection', () => {
  it('projects planning state into a high-priority plan todo', () => {
    const projection = buildTodoProjection(createInput());

    expect(projection).toMatchObject({
      managedBy: 'opencode-hive',
      managedIdPrefix: 'hive:todo-feature:',
      sync: {
        strategy: 'replace-managed-preserve-external',
        preserveNonHiveTodos: true,
        requiresTodoRead: true,
      },
      managedIds: ['hive:todo-feature:feature'],
      items: [
        {
          id: 'hive:todo-feature:feature',
          content: 'Finish the plan for todo-feature',
          status: 'pending',
          priority: 'high',
        },
      ],
    });
  });

  it('projects approved features without tasks into a generate-task-list todo', () => {
    const projection = buildTodoProjection(createInput({
      feature: {
        name: 'todo-feature',
        status: 'approved',
      },
      plan: {
        exists: true,
        status: 'approved',
        approved: true,
      },
    }));

    expect(projection.items).toEqual([
      {
        id: 'hive:todo-feature:feature',
        content: 'Generate the task list for todo-feature',
        status: 'pending',
        priority: 'high',
      },
    ]);
  });

  it('projects runnable and blocked tasks with stable ids and predictable mapping', () => {
    const projection = buildTodoProjection(createInput({
      feature: {
        name: 'todo-feature',
        status: 'executing',
      },
      plan: {
        exists: true,
        status: 'locked',
        approved: true,
      },
      tasks: {
        total: 3,
        pending: 2,
        inProgress: 0,
        done: 1,
        runnable: ['02-build-feature'],
        blockedBy: {
          '03-polish': ['02-build-feature'],
        },
        list: [
          {
            folder: '01-setup',
            name: 'setup',
            planTitle: 'Setup',
            status: 'done',
            origin: 'plan',
            dependsOn: [],
            worktree: null,
          },
          {
            folder: '02-build-feature',
            name: 'build-feature',
            planTitle: 'Build Feature',
            status: 'pending',
            origin: 'plan',
            dependsOn: [],
            worktree: null,
          },
          {
            folder: '03-polish',
            name: 'polish',
            planTitle: 'Polish',
            status: 'pending',
            origin: 'plan',
            dependsOn: ['02-build-feature'],
            worktree: null,
          },
        ],
      },
    }));

    expect(projection.items).toEqual([
      {
        id: 'hive:todo-feature:feature',
        content: 'Keep todo-feature moving',
        status: 'in_progress',
        priority: 'medium',
      },
      {
        id: 'hive:todo-feature:task:01-setup',
        content: 'Setup',
        status: 'completed',
        priority: 'low',
      },
      {
        id: 'hive:todo-feature:task:02-build-feature',
        content: 'Start Build Feature',
        status: 'pending',
        priority: 'high',
      },
      {
        id: 'hive:todo-feature:task:03-polish',
        content: 'Resolve blocker for Polish',
        status: 'pending',
        priority: 'medium',
      },
    ]);
  });

  it('projects completed features into a completed summary todo', () => {
    const projection = buildTodoProjection(createInput({
      feature: {
        name: 'todo-feature',
        status: 'completed',
      },
      plan: {
        exists: true,
        status: 'locked',
        approved: true,
      },
    }));

    expect(projection.items).toEqual([
      {
        id: 'hive:todo-feature:feature',
        content: 'todo-feature is complete',
        status: 'completed',
        priority: 'low',
      },
    ]);
  });
});

describe('mergeTodoProjection', () => {
  it('preserves non-Hive todos through a Hive sync merge/write round-trip', () => {
    const projection = buildTodoProjection(createInput({
      feature: {
        name: 'todo-feature',
        status: 'executing',
      },
      plan: {
        exists: true,
        status: 'locked',
        approved: true,
      },
      tasks: {
        total: 1,
        pending: 0,
        inProgress: 1,
        done: 0,
        runnable: [],
        blockedBy: {},
        list: [
          {
            folder: '01-build-feature',
            name: 'build-feature',
            planTitle: 'Build Feature',
            status: 'in_progress',
            origin: 'plan',
            dependsOn: [],
            worktree: { branch: 'hive/test', hasChanges: true },
          },
        ],
      },
    }));

    const userTodo = {
      id: 'user:follow-up',
      content: 'Remember to update release notes',
      status: 'pending',
      priority: 'medium',
    };

    const merged = mergeTodoProjection([
      userTodo,
      {
        id: 'hive:todo-feature:feature',
        content: 'outdated hive item',
        status: 'pending',
        priority: 'low',
      },
    ], projection);

    expect(merged).toContainEqual(userTodo);
    expect(merged.filter((todo) => todo.id === 'user:follow-up')).toEqual([userTodo]);
    expect(merged).not.toContainEqual(expect.objectContaining({ content: 'outdated hive item' }));
    expect(merged.filter((todo) => todo.id.startsWith('hive:todo-feature:'))).toEqual(projection.items);
  });
});
