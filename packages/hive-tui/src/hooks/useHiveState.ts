import { useState, useEffect, useCallback } from 'react';
import { watch } from 'chokidar';
import { FeatureService, TaskService, PlanService } from 'hive-core';
import type { FeatureInfo, TaskInfo, PlanComment } from 'hive-core';
import * as path from 'path';

interface HiveState {
  feature: FeatureInfo | null;
  tasks: TaskInfo[];
  planContent: string;
  comments: PlanComment[];
  loading: boolean;
}

export function useHiveState(featureName: string, projectRoot: string) {
  const [state, setState] = useState<HiveState>({
    feature: null,
    tasks: [],
    planContent: '',
    comments: [],
    loading: true,
  });

  const refresh = useCallback(() => {
    try {
      const featureService = new FeatureService(projectRoot);
      const taskService = new TaskService(projectRoot);
      const planService = new PlanService(projectRoot);

      const feature = featureService.getInfo(featureName);
      const tasks = taskService.list(featureName);
      
      let planContent = '';
      let comments: PlanComment[] = [];
      try {
        const planResult = planService.read(featureName);
        if (planResult) {
          planContent = planResult.content || '';
          comments = planResult.comments || [];
        }
      } catch {
        // Plan might not exist yet
      }

      setState({
        feature,
        tasks,
        planContent,
        comments,
        loading: false,
      });
    } catch (err) {
      console.error('Error refreshing hive state:', err);
      setState(s => ({ ...s, loading: false }));
    }
  }, [featureName, projectRoot]);

  useEffect(() => {
    // Initial load
    refresh();

    // Set up file watcher
    const featurePath = path.join(projectRoot, '.hive', 'features', featureName);
    const watchPatterns = [
      path.join(featurePath, 'meta.json'),
      path.join(featurePath, 'plan.md'),
      path.join(featurePath, 'comments.json'),
      path.join(featurePath, 'tasks', '*', 'status.json'),
    ];

    const watcher = watch(watchPatterns, {
      ignoreInitial: true,
      persistent: true,
    });

    // Debounce refresh to avoid rapid updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refresh, 100);
    };

    watcher.on('all', debouncedRefresh);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher.close();
    };
  }, [featureName, projectRoot, refresh]);

  return {
    ...state,
    refresh,
  };
}
