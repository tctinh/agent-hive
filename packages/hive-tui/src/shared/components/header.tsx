/**
 * Shared Header component for TUIs
 */
import { Show, type JSX } from 'solid-js';

export interface HeaderProps {
  /** Icon emoji */
  icon: string;
  /** Title text */
  title: string;
  /** Feature name */
  feature: string;
  /** Optional status text (shown on right side) */
  status?: string;
}

export function Header(props: HeaderProps): JSX.Element {
  return (
    <box borderStyle="single" paddingLeft={1}>
      <text>{props.icon} </text>
      <text fg="cyan">{props.title}</text>
      <text>: {props.feature}</text>
      <Show when={props.status}>
        <text fg="gray"> [{props.status}]</text>
      </Show>
    </box>
  );
}
