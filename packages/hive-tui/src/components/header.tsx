/**
 * Header component - Feature name and status badge
 */
import type { JSX } from 'solid-js';

interface HeaderProps {
  feature: string;
  status?: 'active' | 'completed' | 'planning';
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  completed: 'cyan',
  planning: 'yellow',
};

export function Header(props: HeaderProps): JSX.Element {
  const statusColor = () => STATUS_COLORS[props.status || 'active'] || 'gray';
  
  return (
    <box borderStyle="single" paddingLeft={1} paddingRight={1}>
      <text>🐝 HIVE </text>
      <text fg="cyan"><b>{props.feature}</b></text>
      <text> </text>
      <text fg={statusColor()}>{props.status || 'active'}</text>
      <text fg="gray"> [f] switch</text>
    </box>
  );
}
