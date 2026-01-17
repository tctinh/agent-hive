/**
 * TaskList component - Clickable task list with status icons
 */
import { For, type JSX } from 'solid-js';

export interface TaskInfo {
  folder: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

interface TaskListProps {
  tasks: TaskInfo[];
  onTaskClick?: (task: TaskInfo) => void;
  selectedTask?: string | null;
}

const STATUS_ICONS: Record<string, string> = {
  done: '✅',
  in_progress: '🔄',
  pending: '⏳',
  blocked: '❌',
};

export function TaskList(props: TaskListProps): JSX.Element {
  if (props.tasks.length === 0) {
    return <text fg="gray">No tasks yet. Sync tasks from plan.</text>;
  }

  return (
    <box flexDirection="column">
      <For each={props.tasks}>
        {(task) => {
          const icon = () => STATUS_ICONS[task.status] || '⏳';
          const match = task.folder.match(/^(\d+)-(.+)$/);
          const num = match ? match[1] : '??';
          const name = match ? match[2].replace(/-/g, ' ') : task.folder;
          const displayName = name.length > 50 ? name.slice(0, 49) + '…' : name;
          const isSelected = () => props.selectedTask === task.folder;

          return (
            <box onMouseDown={() => props.onTaskClick?.(task)}>
              <text
                fg={isSelected() ? 'cyan' : undefined}
                backgroundColor={isSelected() ? 'blue' : undefined}
              >
                {icon()} <text fg="gray">{num}.</text> {displayName}
              </text>
            </box>
          );
        }}
      </For>
    </box>
  );
}
