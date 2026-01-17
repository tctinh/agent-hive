/**
 * PlanViewer - View plan.md with mouse click to select lines for commenting
 * Key feature: Click on any line to select it, then press 'c' to comment
 */
import { createSignal, createEffect, For, type JSX, Show } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { planService } from 'hive-core';
import { useHive } from '../context/hive';

export function PlanViewer(): JSX.Element {
  const hive = useHive();
  const dimensions = useTerminalDimensions();
  
  const [planContent, setPlanContent] = createSignal<string>('');
  const [currentLine, setCurrentLine] = createSignal(1);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [isCommenting, setIsCommenting] = createSignal(false);
  const [commentText, setCommentText] = createSignal('');
  const [comments, setComments] = createSignal<Record<number, string[]>>({});

  // Calculate visible lines based on terminal height
  // Reserve: header(3) + footer(3) + margins(2) = 8 lines
  const visibleLines = () => Math.max(5, dimensions().height - 10);
  
  const lines = () => planContent().split('\n');
  const visibleContent = () => lines().slice(scrollOffset(), scrollOffset() + visibleLines());

  // Load plan content
  createEffect(() => {
    const feature = hive.feature;
    if (!feature) return;

    try {
      const plan = planService.read(feature, hive.projectRoot);
      setPlanContent(plan?.content || '# No plan.md found');
      
      // Load comments
      const planComments = planService.getComments?.(feature, hive.projectRoot) || [];
      const commentsByLine: Record<number, string[]> = {};
      planComments.forEach((c: any) => {
        if (!commentsByLine[c.line]) commentsByLine[c.line] = [];
        commentsByLine[c.line].push(c.body);
      });
      setComments(commentsByLine);
    } catch (e) {
      setPlanContent('# Error loading plan');
    }
  });

  // Keep currentLine in sync with scroll
  const ensureLineVisible = (lineNum: number) => {
    if (lineNum <= scrollOffset()) {
      setScrollOffset(Math.max(0, lineNum - 1));
    } else if (lineNum > scrollOffset() + visibleLines()) {
      setScrollOffset(lineNum - visibleLines());
    }
  };

  // Keyboard navigation
  useKeyboard((evt) => {
    if (isCommenting()) {
      // Handle comment input
      if (evt.name === 'escape') {
        setIsCommenting(false);
        setCommentText('');
      } else if (evt.name === 'return') {
        // Save comment
        if (commentText().trim()) {
          try {
            planService.addComment?.(hive.feature, {
              line: currentLine(),
              body: commentText().trim(),
              author: 'tui',
            }, hive.projectRoot);
            // Update local state
            const newComments = { ...comments() };
            if (!newComments[currentLine()]) newComments[currentLine()] = [];
            newComments[currentLine()].push(commentText().trim());
            setComments(newComments);
          } catch (e) {
            // Ignore save errors
          }
        }
        setIsCommenting(false);
        setCommentText('');
      } else if (evt.name === 'backspace') {
        setCommentText(t => t.slice(0, -1));
      } else if (evt.key && evt.key.length === 1) {
        setCommentText(t => t + evt.key);
      }
      return;
    }

    // Normal navigation
    if (evt.name === 'escape') {
      hive.setView('dashboard');
    } else if (evt.name === 'c') {
      setIsCommenting(true);
    } else if (evt.name === 'up' || evt.name === 'k') {
      setCurrentLine(l => {
        const newLine = Math.max(1, l - 1);
        ensureLineVisible(newLine);
        return newLine;
      });
    } else if (evt.name === 'down' || evt.name === 'j') {
      setCurrentLine(l => {
        const newLine = Math.min(lines().length, l + 1);
        ensureLineVisible(newLine);
        return newLine;
      });
    } else if (evt.name === 'pageup') {
      const jump = Math.floor(visibleLines() / 2);
      setCurrentLine(l => {
        const newLine = Math.max(1, l - jump);
        setScrollOffset(Math.max(0, newLine - 1));
        return newLine;
      });
    } else if (evt.name === 'pagedown') {
      const jump = Math.floor(visibleLines() / 2);
      setCurrentLine(l => {
        const newLine = Math.min(lines().length, l + jump);
        setScrollOffset(Math.min(lines().length - visibleLines(), newLine - visibleLines()));
        return newLine;
      });
    } else if (evt.name === 'g') {
      setCurrentLine(1);
      setScrollOffset(0);
    } else if (evt.name === 'G' || (evt.shift && evt.name === 'g')) {
      setCurrentLine(lines().length);
      setScrollOffset(Math.max(0, lines().length - visibleLines()));
    }
  });

  // Click handler for line selection
  const handleLineClick = (lineIndex: number) => {
    const actualLine = scrollOffset() + lineIndex + 1;
    setCurrentLine(actualLine);
  };

  return (
    <box flexDirection="column">
      {/* Header */}
      <box borderStyle="single" paddingLeft={1}>
        <text>📝 PLAN </text>
        <text fg="cyan"><b>{hive.feature}</b></text>
        <text fg="gray"> Line {currentLine()}/{lines().length}</text>
        <text fg="gray">  [Esc] back</text>
      </box>

      {/* Plan content */}
      <box flexDirection="column" flexGrow={1} borderStyle="single" paddingLeft={1}>
        <For each={visibleContent()}>
          {(line, idx) => {
            const lineNum = () => scrollOffset() + idx() + 1;
            const isSelected = () => lineNum() === currentLine();
            const hasComment = () => !!comments()[lineNum()];
            const lineNumStr = () => String(lineNum()).padStart(3, ' ');

            return (
              <box onMouseDown={() => handleLineClick(idx())}>
                <text fg="gray">{lineNumStr()}</text>
                <text fg={hasComment() ? 'yellow' : 'gray'}>{hasComment() ? '💬' : ' │'}</text>
                <text 
                  fg={isSelected() ? 'cyan' : undefined}
                  backgroundColor={isSelected() ? 'blue' : undefined}
                >
                  {line || ' '}
                </text>
              </box>
            );
          }}
        </For>
        
        {/* Scroll indicator */}
        <text fg="gray">
          ── {scrollOffset() + 1}-{Math.min(scrollOffset() + visibleLines(), lines().length)}/{lines().length} ──
        </text>
      </box>

      {/* Comment input or footer */}
      <Show when={isCommenting()} fallback={
        <box borderStyle="single" paddingLeft={1}>
          <text fg="gray">↑↓/jk scroll  g/G top/bottom  [c] comment on line {currentLine()}  [Esc] back</text>
        </box>
      }>
        <box borderStyle="single" paddingLeft={1}>
          <text fg="yellow">Comment on line {currentLine()}: </text>
          <text>{commentText()}</text>
          <text fg="gray">█</text>
          <text fg="gray"> [Enter] save [Esc] cancel</text>
        </box>
      </Show>
    </box>
  );
}
