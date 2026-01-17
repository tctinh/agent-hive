import React from 'react';
import { Box, Text } from 'ink';

interface DashboardProps {
  feature: string;
  projectRoot: string;
}

export function Dashboard({ feature, projectRoot }: DashboardProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" paddingX={1}>
        <Text>🐝 HIVE │ </Text>
        <Text color="cyan" bold>{feature}</Text>
        <Text> │ </Text>
        <Text color="yellow">loading...</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>Dashboard view - to be implemented in Task 2</Text>
      </Box>
      
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>[p] plan  [s] spec  [f] feature  [q] quit</Text>
      </Box>
    </Box>
  );
}
