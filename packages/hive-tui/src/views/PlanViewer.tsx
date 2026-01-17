import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { PlanService } from 'hive-core';
import type { PlanComment } from 'hive-core';
import { CommentInput } from '../components/CommentInput.js';

interface PlanViewerProps {
  feature: string;
  projectRoot: string;
  onBack: () => void;
}

export function PlanViewer({ feature, projectRoot, onBack }: PlanViewerProps) {
  const { stdout } = useStdout();
  const [planContent, setPlanContent] = useState<string>('');
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [currentLine, setCurrentLine] = useState(1);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calculate visible lines based on terminal height
  const terminalHeight = stdout?.rows || 24;
  const visibleLines = Math.max(5, terminalHeight - 12); // Reserve space for header/footer/comments
  const [scrollOffset, setScrollOffset] = useState(0);

  const lines = useMemo(() => planContent.split('\n'), [planContent]);
  const commentedLines = useMemo(
    () => new Set(comments.map(c => c.line)),
    [comments]
  );

  // Load plan content and comments
  useEffect(() => {
    const load = async () => {
      try {
        const planService = new PlanService(projectRoot);
        const result = planService.read(feature);
        if (result) {
          setPlanContent(result.content || '');
          setComments(result.comments || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [feature, projectRoot]);

  // Keyboard navigation
  useInput((input, key) => {
    if (isAddingComment) return; // Let CommentInput handle keys

    if (key.escape || input === 'q') {
      onBack();
    } else if (input === 'c') {
      setIsAddingComment(true);
    } else if (key.upArrow || input === 'k') {
      setCurrentLine(l => Math.max(1, l - 1));
      // Scroll up if needed
      if (currentLine - 1 < scrollOffset + 1) {
        setScrollOffset(o => Math.max(0, o - 1));
      }
    } else if (key.downArrow || input === 'j') {
      setCurrentLine(l => Math.min(lines.length, l + 1));
      // Scroll down if needed
      if (currentLine + 1 > scrollOffset + visibleLines) {
        setScrollOffset(o => Math.min(lines.length - visibleLines, o + 1));
      }
    } else if (key.pageUp) {
      const jump = Math.floor(visibleLines / 2);
      setCurrentLine(l => Math.max(1, l - jump));
      setScrollOffset(o => Math.max(0, o - jump));
    } else if (key.pageDown) {
      const jump = Math.floor(visibleLines / 2);
      setCurrentLine(l => Math.min(lines.length, l + jump));
      setScrollOffset(o => Math.min(lines.length - visibleLines, o + jump));
    }
  });

  const handleAddComment = async (body: string) => {
    try {
      const planService = new PlanService(projectRoot);
      planService.addComment(feature, {
        line: currentLine,
        body,
        author: 'tui'
      });
      // Reload comments
      const result = planService.read(feature);
      if (result) {
        setComments(result.comments || []);
      }
    } finally {
      setIsAddingComment(false);
    }
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading plan...</Text>
      </Box>
    );
  }

  if (!planContent) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="single" paddingX={1}>
          <Text>📄 PLAN: </Text>
          <Text color="cyan" bold>{feature}</Text>
          <Text dimColor>  [Esc] back</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">No plan found. Create one with hive_plan_write.</Text>
        </Box>
      </Box>
    );
  }

  // Get visible lines
  const visibleContent = lines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text>📄 PLAN: </Text>
        <Text color="cyan" bold>{feature}</Text>
        <Text dimColor>  L{currentLine}/{lines.length}</Text>
        <Text dimColor>  [c] comment [Esc] back</Text>
      </Box>

      {/* Plan content */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        {visibleContent.map((line, idx) => {
          const lineNum = scrollOffset + idx + 1;
          const isCurrentLine = lineNum === currentLine;
          const hasComment = commentedLines.has(lineNum);
          const lineNumStr = String(lineNum).padStart(4, ' ');

          return (
            <Box key={lineNum}>
              <Text color={isCurrentLine ? 'cyan' : 'gray'}>{lineNumStr} │</Text>
              {hasComment && <Text>💬</Text>}
              {!hasComment && <Text>  </Text>}
              <Text 
                color={isCurrentLine ? 'white' : undefined}
                backgroundColor={isCurrentLine ? 'blue' : undefined}
              >
                {line || ' '}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Comment input or comments list */}
      {isAddingComment ? (
        <Box marginTop={1}>
          <CommentInput
            line={currentLine}
            onSubmit={handleAddComment}
            onCancel={() => setIsAddingComment(false)}
          />
        </Box>
      ) : comments.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>COMMENTS ({comments.length})</Text>
          {comments.slice(0, 3).map((c, i) => (
            <Text key={c.id || i} dimColor>
              L{c.line}: {c.body.slice(0, 50)}{c.body.length > 50 ? '...' : ''}
            </Text>
          ))}
          {comments.length > 3 && (
            <Text dimColor>...and {comments.length - 3} more</Text>
          )}
        </Box>
      ) : null}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>↑↓ scroll  [c] comment  [Esc] back</Text>
      </Box>
    </Box>
  );
}
