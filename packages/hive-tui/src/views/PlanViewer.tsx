import React from 'react';
import { Box, Text, useInput } from 'ink';

interface PlanViewerProps {
  feature: string;
  projectRoot: string;
  onBack: () => void;
}

export function PlanViewer({ feature, projectRoot, onBack }: PlanViewerProps) {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" paddingX={1}>
        <Text>📄 PLAN: </Text>
        <Text color="cyan" bold>{feature}</Text>
        <Text dimColor>  [Esc] back</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>PlanViewer - to be implemented in Task 3</Text>
      </Box>
    </Box>
  );
}
