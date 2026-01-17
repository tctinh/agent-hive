import React from 'react';
import { Box, Text } from 'ink';
import { useHiveState } from '../hooks/useHiveState.js';
import { Header } from '../components/Header.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { TaskList } from '../components/TaskList.js';

interface DashboardProps {
  feature: string;
  projectRoot: string;
}

export function Dashboard({ feature, projectRoot }: DashboardProps) {
  const { feature: featureInfo, tasks, comments, loading } = useHiveState(feature, projectRoot);

  if (loading || !featureInfo) {
    return (
      <Box padding={1}>
        <Text>Loading dashboard...</Text>
      </Box>
    );
  }

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const commentCount = comments.length;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Header feature={featureInfo} />

      {/* Progress */}
      <Box marginTop={1}>
        <ProgressBar done={doneCount} total={totalCount} />
      </Box>

      {/* Task List */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <TaskList tasks={tasks} />
      </Box>

      {/* Comment indicator */}
      {commentCount > 0 && (
        <Box marginTop={1}>
          <Text>💬 {commentCount} comment{commentCount > 1 ? 's' : ''} on plan</Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>[p] plan  [s] spec  [f] feature  [q] quit</Text>
      </Box>
    </Box>
  );
}
