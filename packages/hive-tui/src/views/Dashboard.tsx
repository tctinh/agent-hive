import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { FeatureService, TaskService, PlanService } from 'hive-core';
import type { FeatureInfo, TaskInfo } from 'hive-core';
import { Header } from '../components/Header.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { TaskList } from '../components/TaskList.js';

interface DashboardProps {
  feature: string;
  projectRoot: string;
}

export function Dashboard({ feature, projectRoot }: DashboardProps) {
  const [featureInfo, setFeatureInfo] = useState<FeatureInfo | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const featureService = new FeatureService(projectRoot);
        const taskService = new TaskService(projectRoot);
        const planService = new PlanService(projectRoot);

        const info = featureService.getInfo(feature);
        if (info) {
          setFeatureInfo(info);
        }

        const taskList = taskService.list(feature);
        setTasks(taskList);

        // Get comment count
        try {
          const comments = planService.getComments(feature);
          setCommentCount(comments.length);
        } catch {
          setCommentCount(0);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [feature, projectRoot]);

  if (loading || !featureInfo) {
    return (
      <Box padding={1}>
        <Text>Loading dashboard...</Text>
      </Box>
    );
  }

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;

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
