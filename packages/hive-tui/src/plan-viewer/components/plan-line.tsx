/**
 * PlanLine - Displays a single line from plan.md with inline comments
 */
import { For, Show, type JSX } from 'solid-js';

export interface PlanComment {
  id: string;
  line: number;
  body: string;
  author: string;
  timestamp: string;
}

export interface PlanLineProps {
  /** Line number (1-based) */
  lineNum: number;
  /** Line text content */
  text: string;
  /** Comments on this line */
  comments: PlanComment[];
  /** Whether this line is selected */
  isSelected: boolean;
  /** Currently selected comment ID (if any) */
  selectedCommentId: string | null;
  /** Called when line is clicked */
  onLineClick: () => void;
  /** Called when a comment is clicked */
  onCommentClick: (commentId: string) => void;
}

export function PlanLine(props: PlanLineProps): JSX.Element {
  // Format line number with padding
  const lineNumStr = () => String(props.lineNum).padStart(3, ' ');

  // Determine line color based on content
  const lineColor = () => {
    const text = props.text;
    if (text.startsWith('# ')) return 'cyan';
    if (text.startsWith('## ')) return 'yellow';
    if (text.startsWith('### ')) return 'green';
    if (text.startsWith('```')) return 'magenta';
    return undefined;
  };

  const hasComments = () => props.comments.length > 0;

  return (
    <box flexDirection="column">
      {/* Main line */}
      <box onMouseDown={props.onLineClick}>
        <text fg="gray">{lineNumStr()}</text>
        <text fg={hasComments() ? 'yellow' : 'gray'}>{hasComments() ? '💬' : ' │'}</text>
        <text 
          fg={props.isSelected ? 'black' : lineColor()}
          bg={props.isSelected ? 'cyan' : undefined}
        >
          {props.text || ' '}
        </text>
      </box>

      {/* Inline comments below the line */}
      <Show when={hasComments()}>
        <For each={props.comments}>
          {(comment) => (
            <box onMouseDown={() => props.onCommentClick(comment.id)}>
              <text fg="gray">     </text>
              <text 
                fg={props.selectedCommentId === comment.id ? 'black' : 'cyan'}
                bg={props.selectedCommentId === comment.id ? 'magenta' : undefined}
              >
                💬 {comment.author}: {comment.body}
              </text>
            </box>
          )}
        </For>
      </Show>
    </box>
  );
}
