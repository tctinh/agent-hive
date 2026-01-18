/**
 * CommentEditor - Inline input for adding/editing comments
 */
import type { Accessor } from 'solid-js';
import type { JSX } from 'solid-js';

export interface CommentEditorProps {
  /** Edit mode: 'add' or 'edit' */
  mode: 'add' | 'edit' | 'none';
  /** Current text being edited - must be accessor for reactivity */
  text: Accessor<string>;
  /** Line number being commented on */
  lineNum: number;
}

export function CommentEditor(props: CommentEditorProps): JSX.Element {
  const modeLabel = () => props.mode === 'add' ? 'Add comment' : 'Edit comment';
  
  // Use accessor to ensure reactivity
  const displayText = () => props.text();
  
  return (
    <box borderStyle="single" paddingLeft={1} paddingRight={1}>
      <text fg="yellow">{modeLabel()} on line {props.lineNum}: </text>
      <text fg="white">{displayText()}</text>
      <text fg="cyan" blink>_</text>
      <text fg="gray"> | [Enter] save [Esc] cancel</text>
    </box>
  );
}
