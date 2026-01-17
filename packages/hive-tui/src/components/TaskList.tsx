import React from 'react';
import { Box, Text } from 'ink';
import type { TaskInfo } from 'hive-core';

interface TaskListProps {
  tasks: TaskInfo[];
  columns?: number;
}

const STATUS_ICONS: Record<string, string> = {
  done: '✅',
  in_progress: '🔄',
  pending: '⏳',
  cancelled: '❌',
};

export function TaskList({ tasks, columns = 3 }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Box paddingY={1}>
        <Text dimColor>No tasks yet. Sync tasks from plan.</Text>
      </Box>
    );
  }

  // Group tasks into rows
  const rows: TaskInfo[][] = [];
  for (let i = 0; i < tasks.length; i += columns) {
    rows.push(tasks.slice(i, i + columns));
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} gap={2}>
          {row.map((task) => {
            const icon = STATUS_ICONS[task.status] || '⏳';
            // Truncate long names
            const displayName = task.folder.length > 15 
              ? task.folder.slice(0, 14) + '…' 
              : task.folder;
            
            return (
              <Box key={task.folder} width={18}>
                <Text>
                  {icon} <Text dimColor>{displayName}</Text>
                </Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
