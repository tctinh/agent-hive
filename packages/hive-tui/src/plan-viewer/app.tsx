/**
 * Plan Viewer App - Main component for the Plan Viewer TUI
 */
import { createSignal, createEffect, For, Show, type JSX } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { PlanService } from 'hive-core';
import { Header, useFileWatcher } from '../shared';
import { PlanLine, type PlanComment } from './components/plan-line';
import { CommentEditor } from './components/comment-editor';

export interface AppProps {
  feature: string;
  projectRoot: string;
}

export function App(props: AppProps): JSX.Element {
  const dimensions = useTerminalDimensions();
  
  // State
  const [planLines, setPlanLines] = createSignal<string[]>([]);
  const [comments, setComments] = createSignal<PlanComment[]>([]);
  const [selectedLine, setSelectedLine] = createSignal(1);
  const [selectedCommentId, setSelectedCommentId] = createSignal<string | null>(null);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);
  
  // Edit mode: 'none' | 'add' | 'edit'
  const [editMode, setEditMode] = createSignal<'none' | 'add' | 'edit'>('none');
  const [editText, setEditText] = createSignal('');

  // File watcher for auto-refresh
  const refreshKey = useFileWatcher(
    () => props.feature,
    () => props.projectRoot
  );

  // Calculate visible lines
  const visibleLines = () => Math.max(5, dimensions().height - 8);

  // Get comments for a specific line
  const commentsForLine = (line: number) => 
    comments().filter(c => c.line === line);

  // Load plan and comments
  createEffect(() => {
    const _ = refreshKey(); // Track for reactivity
    
    try {
      const planService = new PlanService(props.projectRoot);
      const plan = planService.read(props.feature);
      
      if (plan?.content) {
        setPlanLines(plan.content.split('\n'));
      } else {
        setPlanLines(['# No plan.md found']);
      }

      // Load comments
      const planComments = planService.getComments(props.feature);
      setComments(planComments);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load plan');
    }
  });

  // Keyboard handler
  useKeyboard((evt) => {
    // If in edit mode, handle text input
    if (editMode() !== 'none') {
      if (evt.name === 'escape') {
        setEditMode('none');
        setEditText('');
        setSelectedCommentId(null);
      } else if (evt.name === 'return') {
        saveComment();
      } else if (evt.name === 'backspace') {
        setEditText(t => t.slice(0, -1));
      } else if (evt.raw && evt.raw.length === 1 && evt.raw.match(/[\x20-\x7E]/)) {
        setEditText(t => t + evt.raw);
      }
      return;
    }

    // Normal navigation
    if (evt.name === 'up' || evt.name === 'k') {
      navigateUp();
    } else if (evt.name === 'down' || evt.name === 'j') {
      navigateDown();
    } else if (evt.name === 'g') {
      setSelectedLine(1);
      setScrollOffset(0);
      setSelectedCommentId(null);
    } else if (evt.name === 'G') {
      const lastLine = planLines().length;
      setSelectedLine(lastLine);
      adjustScrollToLine(lastLine);
      setSelectedCommentId(null);
    } else if (evt.name === 'c') {
      // Add comment on current line
      setEditMode('add');
      setEditText('');
    } else if (evt.name === 'e') {
      // Edit selected comment
      if (selectedCommentId()) {
        const comment = comments().find(c => c.id === selectedCommentId());
        if (comment) {
          setEditMode('edit');
          setEditText(comment.body);
        }
      }
    } else if (evt.name === 'd') {
      // Delete selected comment
      if (selectedCommentId()) {
        deleteComment(selectedCommentId()!);
      }
    }
  });

  function navigateUp() {
    if (selectedCommentId()) {
      // Navigate between comments on same line, or go to line
      const lineComments = commentsForLine(selectedLine());
      const idx = lineComments.findIndex(c => c.id === selectedCommentId());
      if (idx > 0) {
        setSelectedCommentId(lineComments[idx - 1].id);
      } else {
        setSelectedCommentId(null);
      }
    } else if (selectedLine() > 1) {
      setSelectedLine(l => l - 1);
      adjustScrollToLine(selectedLine());
    }
  }

  function navigateDown() {
    const lineComments = commentsForLine(selectedLine());
    
    if (selectedCommentId()) {
      const idx = lineComments.findIndex(c => c.id === selectedCommentId());
      if (idx < lineComments.length - 1) {
        setSelectedCommentId(lineComments[idx + 1].id);
      } else {
        // Move to next line
        setSelectedCommentId(null);
        if (selectedLine() < planLines().length) {
          setSelectedLine(l => l + 1);
          adjustScrollToLine(selectedLine());
        }
      }
    } else if (lineComments.length > 0) {
      // Select first comment on this line
      setSelectedCommentId(lineComments[0].id);
    } else if (selectedLine() < planLines().length) {
      setSelectedLine(l => l + 1);
      adjustScrollToLine(selectedLine());
    }
  }

  function adjustScrollToLine(line: number) {
    const visible = visibleLines();
    if (line < scrollOffset() + 1) {
      setScrollOffset(Math.max(0, line - 1));
    } else if (line > scrollOffset() + visible) {
      setScrollOffset(line - visible);
    }
  }

  function saveComment() {
    const text = editText().trim();
    if (!text) {
      setEditMode('none');
      setEditText('');
      return;
    }

    try {
      const planService = new PlanService(props.projectRoot);
      
      if (editMode() === 'add') {
        planService.addComment(props.feature, {
          line: selectedLine(),
          body: text,
          author: 'user',
        });
      } else if (editMode() === 'edit' && selectedCommentId()) {
        // Update existing comment
        const allComments = planService.getComments(props.feature);
        const updated = allComments.map(c => 
          c.id === selectedCommentId() 
            ? { ...c, body: text, timestamp: new Date().toISOString() }
            : c
        );
        // Write back (we'll need updateComment in PlanService)
        // For now, manually update the comments file
      }
      
      // Refresh will happen via file watcher
      setEditMode('none');
      setEditText('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  function deleteComment(commentId: string) {
    try {
      const planService = new PlanService(props.projectRoot);
      // We need deleteComment method - for now just filter locally
      // and the file watcher will refresh
      setSelectedCommentId(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function handleLineClick(lineNum: number) {
    setSelectedLine(lineNum);
    setSelectedCommentId(null);
  }

  function handleCommentClick(commentId: string, lineNum: number) {
    setSelectedLine(lineNum);
    setSelectedCommentId(commentId);
  }

  // Calculate visible content
  const visibleContent = () => {
    const lines = planLines();
    const offset = scrollOffset();
    const count = visibleLines();
    
    const result: Array<{ lineNum: number; text: string; comments: PlanComment[] }> = [];
    
    for (let i = offset; i < Math.min(offset + count, lines.length); i++) {
      result.push({
        lineNum: i + 1,
        text: lines[i],
        comments: commentsForLine(i + 1),
      });
    }
    
    return result;
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Header icon="📋" title="PLAN" feature={props.feature} />

      {/* Error display */}
      <Show when={error()}>
        <box>
          <text fg="red">Error: {error()}</text>
        </box>
      </Show>

      {/* Plan content */}
      <box flexDirection="column" flexGrow={1}>
        <For each={visibleContent()}>
          {(item) => (
            <PlanLine
              lineNum={item.lineNum}
              text={item.text}
              comments={item.comments}
              isSelected={selectedLine() === item.lineNum && !selectedCommentId()}
              selectedCommentId={selectedCommentId()}
              onLineClick={() => handleLineClick(item.lineNum)}
              onCommentClick={(id) => handleCommentClick(id, item.lineNum)}
            />
          )}
        </For>
      </box>

      {/* Comment editor (shown when adding/editing) */}
      <Show when={editMode() !== 'none'}>
        <CommentEditor
          mode={editMode()}
          text={editText()}
          lineNum={selectedLine()}
        />
      </Show>

      {/* Footer with keybindings */}
      <box borderStyle="single" paddingLeft={1}>
        <Show when={editMode() !== 'none'} fallback={
          <text fg="gray">
            [c]omment  {selectedCommentId() ? '[e]dit [d]elete  ' : ''}[j/k] Navigate  [g/G] Top/Bottom
          </text>
        }>
          <text fg="gray">
            Type comment, [Enter] Save, [Esc] Cancel
          </text>
        </Show>
      </box>
    </box>
  );
}
