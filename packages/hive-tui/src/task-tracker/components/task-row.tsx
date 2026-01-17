/**
 * TaskRow - Displays a single task in the task list
 */
import type { JSX } from 'solid-js';

export interface TaskRowProps {
  task: {
    name: string;
    status: 'pending' | 'in_progress' | 'done';
    folder: string;
    hasSpec: boolean;
    hasReport: boolean;
  };
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_ICONS: Record<string, string> = {
  done: '✓',
  in_progress: '⏳',
  pending: '○',
};

const STATUS_COLORS: Record<string, string> = {
  done: 'green',
  in_progress: 'yellow',
  pending: 'gray',
};

export function TaskRow(props: TaskRowProps): JSX.Element {
  const icon = () => STATUS_ICONS[props.task.status] || '?';
  const color = () => STATUS_COLORS[props.task.status] || 'white';
  
  // Format task name nicely
  const displayName = () => {
    return props.task.name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const badges = () => {
    const parts: string[] = [];
    if (props.task.hasSpec) parts.push('📄');
    if (props.task.hasReport) parts.push('📝');
    return parts.join(' ');
  };

  return (
    <box onMouseDown={props.onClick}>
      <text 
        fg={props.isSelected ? 'black' : color()}
        bg={props.isSelected ? 'cyan' : undefined}
      >
        {icon()} {displayName()}
      </text>
      <text fg="gray"> {badges()}</text>
    </box>
  );
}
