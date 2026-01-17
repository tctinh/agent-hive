/**
 * CommentEditor - Inline input for adding/editing comments
 */
import type { JSX } from 'solid-js';

export interface CommentEditorProps {
  /** Edit mode: 'add' or 'edit' */
  mode: 'add' | 'edit' | 'none';
  /** Current text being edited */
  text: string;
  /** Line number being commented on */
  lineNum: number;
}

export function CommentEditor(props: CommentEditorProps): JSX.Element {
  const modeLabel = () => props.mode === 'add' ? 'Add comment' : 'Edit comment';
  
  return (
    <box borderStyle="single" paddingLeft={1}>
      <text fg="yellow">{modeLabel()} on line {props.lineNum}: </text>
      <text>{props.text}</text>
      <text fg="gray">█</text>
      <text fg="gray"> [Enter] save [Esc] cancel</text>
    </box>
  );
}
