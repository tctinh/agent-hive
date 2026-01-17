import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  done: number;
  total: number;
  width?: number;
}

export function ProgressBar({ done, total, width = 20 }: ProgressBarProps) {
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  const filled = total === 0 ? 0 : Math.round((done / total) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text dimColor>TASKS [{done}/{total}] </Text>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {percentage}%</Text>
    </Box>
  );
}
