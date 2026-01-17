import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { TaskService } from 'hive-core';
import type { TaskInfo } from 'hive-core';
import * as fs from 'fs';
import * as path from 'path';

interface SpecViewerProps {
  feature: string;
  projectRoot: string;
  onBack: () => void;
}

export function SpecViewer({ feature, projectRoot, onBack }: SpecViewerProps) {
  const { stdout } = useStdout();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [specContent, setSpecContent] = useState<string>('');
  const [currentLine, setCurrentLine] = useState(0);
  const [loading, setLoading] = useState(true);

  // Calculate visible lines based on terminal height
  const terminalHeight = stdout?.rows || 24;
  const visibleLines = Math.max(5, terminalHeight - 10);

  const lines = useMemo(() => specContent.split('\n'), [specContent]);

  // Load tasks
  useEffect(() => {
    const load = async () => {
      try {
        const taskService = new TaskService(projectRoot);
        const taskList = taskService.list(feature);
        setTasks(taskList);

        // Find in-progress task, or first pending, or first task
        const inProgress = taskList.findIndex(t => t.status === 'in_progress');
        const pending = taskList.findIndex(t => t.status === 'pending');
        const defaultIdx = inProgress >= 0 ? inProgress : pending >= 0 ? pending : 0;
        setSelectedTaskIndex(defaultIdx);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [feature, projectRoot]);

  // Load spec content when selected task changes
  useEffect(() => {
    if (tasks.length === 0) return;

    const task = tasks[selectedTaskIndex];
    if (!task) return;

    const specPath = path.join(
      projectRoot,
      '.hive',
      'features',
      feature,
      'tasks',
      task.folder,
      'spec.md'
    );

    try {
      if (fs.existsSync(specPath)) {
        const content = fs.readFileSync(specPath, 'utf-8');
        setSpecContent(content);
        setCurrentLine(0);
      } else {
        setSpecContent('');
      }
    } catch {
      setSpecContent('');
    }
  }, [tasks, selectedTaskIndex, feature, projectRoot]);

  // Keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    } else if (key.upArrow || input === 'k') {
      setCurrentLine(l => Math.max(0, l - 1));
    } else if (key.downArrow || input === 'j') {
      setCurrentLine(l => Math.min(Math.max(0, lines.length - visibleLines), l + 1));
    } else if (key.leftArrow || input === 'h') {
      // Previous task
      setSelectedTaskIndex(i => Math.max(0, i - 1));
    } else if (key.rightArrow || input === 'l') {
      // Next task
      setSelectedTaskIndex(i => Math.min(tasks.length - 1, i + 1));
    } else if (key.pageUp) {
      setCurrentLine(l => Math.max(0, l - Math.floor(visibleLines / 2)));
    } else if (key.pageDown) {
      setCurrentLine(l => Math.min(Math.max(0, lines.length - visibleLines), l + Math.floor(visibleLines / 2)));
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading tasks...</Text>
      </Box>
    );
  }

  if (tasks.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="single" paddingX={1}>
          <Text>📋 SPEC: </Text>
          <Text color="cyan" bold>{feature}</Text>
          <Text dimColor>  [Esc] back</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">No tasks found. Sync tasks from plan first.</Text>
        </Box>
      </Box>
    );
  }

  const currentTask = tasks[selectedTaskIndex];
  const visibleContent = lines.slice(currentLine, currentLine + visibleLines);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text>📋 SPEC: </Text>
        <Text color="cyan" bold>{currentTask?.folder || 'unknown'}</Text>
        <Text dimColor>  [{selectedTaskIndex + 1}/{tasks.length}]  [←→] switch task [Esc] back</Text>
      </Box>

      {/* Task selector */}
      <Box marginTop={1} gap={1}>
        {tasks.slice(0, 5).map((t, i) => (
          <Text
            key={t.folder}
            color={i === selectedTaskIndex ? 'cyan' : 'gray'}
            bold={i === selectedTaskIndex}
          >
            {i === selectedTaskIndex ? '▶' : ' '}{t.folder.slice(0, 12)}
          </Text>
        ))}
        {tasks.length > 5 && <Text dimColor>+{tasks.length - 5} more</Text>}
      </Box>

      {/* Spec content */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        {!specContent ? (
          <Text color="yellow">No spec.md found for this task.</Text>
        ) : (
          visibleContent.map((line, idx) => {
            const lineNum = currentLine + idx + 1;
            const lineNumStr = String(lineNum).padStart(4, ' ');

            return (
              <Box key={lineNum}>
                <Text color="gray">{lineNumStr} │</Text>
                <Text>{line || ' '}</Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>↑↓ scroll  ←→ switch task  [Esc] back</Text>
      </Box>
    </Box>
  );
}
