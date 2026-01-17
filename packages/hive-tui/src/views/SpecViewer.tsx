import React from 'react';
import { Box, Text, useInput } from 'ink';

interface SpecViewerProps {
  feature: string;
  projectRoot: string;
  onBack: () => void;
}

export function SpecViewer({ feature, projectRoot, onBack }: SpecViewerProps) {
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" paddingX={1}>
        <Text>📋 SPEC: </Text>
        <Text color="cyan" bold>{feature}</Text>
        <Text dimColor>  [Esc] back</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>SpecViewer - to be implemented in Task 4</Text>
      </Box>
    </Box>
  );
}
