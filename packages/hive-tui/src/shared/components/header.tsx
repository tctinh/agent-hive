/**
 * Shared Header component for TUIs
 */
import type { JSX } from 'solid-js';

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
    <box
      borderStyle="round"
      borderColor="cyan"
      paddingLeft={1}
      paddingRight={1}
    >
      <text>
        {props.icon} <b fg="cyan">{props.title}</b>: {props.feature}
        {props.status && <text fg="gray"> [{props.status}]</text>}
      </text>
    </box>
  );
}
