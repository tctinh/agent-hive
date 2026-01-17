/**
 * ProgressBar component - Visual progress indicator
 */
import type { JSX } from 'solid-js';

interface ProgressBarProps {
  completed: number;
  total: number;
  width?: number;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element {
  const width = () => props.width || 20;
  const percent = () => props.total > 0 ? Math.round((props.completed / props.total) * 100) : 0;
  const filledWidth = () => Math.round((props.completed / Math.max(props.total, 1)) * width());
  const emptyWidth = () => width() - filledWidth();

  return (
    <box>
      <text fg="gray">TASKS [{props.completed}/{props.total}] </text>
      <text fg="green">{'█'.repeat(filledWidth())}</text>
      <text fg="gray">{'░'.repeat(emptyWidth())}</text>
      <text> {percent()}%</text>
    </box>
  );
}
