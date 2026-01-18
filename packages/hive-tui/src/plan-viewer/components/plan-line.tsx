/**
 * PlanLine - Displays a single line from plan.md with inline comments
 * Simplified: No line numbers, just content with syntax highlighting
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
  // Determine line color based on content (markdown syntax highlighting)
  const lineColor = () => {
    const text = props.text;
    if (text.startsWith('# ')) return 'cyan';
    if (text.startsWith('## ')) return 'yellow';
    if (text.startsWith('### ')) return 'green';
    if (text.startsWith('```')) return 'magenta';
    if (text.startsWith('- ') || text.startsWith('* ')) return 'white';
    return 'white';
  };

  const hasComments = () => props.comments.length > 0;

  // Prefix indicator: * for lines with comments, space otherwise
  const prefix = () => hasComments() ? '* ' : '  ';

  return (
    <box flexDirection="column">
      {/* Main line */}
      <text
        fg={props.isSelected ? 'black' : lineColor()}
        bg={props.isSelected ? 'cyan' : undefined}
        onClick={props.onLineClick}
      >
        {prefix()}{props.text || ' '}
      </text>

      {/* Inline comments below the line */}
      <Show when={hasComments()}>
        <For each={props.comments}>
          {(comment) => (
            <text
              fg={props.selectedCommentId === comment.id ? 'black' : 'cyan'}
              bg={props.selectedCommentId === comment.id ? 'magenta' : undefined}
              onClick={() => props.onCommentClick(comment.id)}
            >
              {'    >> '}{comment.author}: {comment.body}
            </text>
          )}
        </For>
      </Show>
    </box>
  );
}
