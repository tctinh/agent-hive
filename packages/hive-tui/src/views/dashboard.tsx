/**
 * Dashboard view - Main view showing feature info and task list
 */
import { createSignal, createEffect, For, type JSX } from 'solid-js';
import { featureService, taskService, type TaskInfo as HiveTaskInfo } from 'hive-core';
import { useHive } from '../context/hive';
import { Header } from '../components/header';
import { ProgressBar } from '../components/progress-bar';
import { TaskList, type TaskInfo } from '../components/task-list';

export function Dashboard(): JSX.Element {
  const hive = useHive();
  const [tasks, setTasks] = createSignal<TaskInfo[]>([]);
  const [status, setStatus] = createSignal<'active' | 'completed' | 'planning'>('active');
  const [error, setError] = createSignal<string | null>(null);

  // Load feature data
  createEffect(() => {
    const feature = hive.feature;
    if (!feature) return;

    try {
      // Get feature info
      const info = featureService.getInfo(feature, hive.projectRoot);
      if (info) {
        setStatus(info.status as any || 'active');
      }

      // Get tasks
      const hiveTasks = taskService.list(feature, hive.projectRoot);
      const mappedTasks: TaskInfo[] = hiveTasks.map((t: HiveTaskInfo) => ({
        folder: t.folder,
        status: t.status as TaskInfo['status'],
      }));
      setTasks(mappedTasks);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load feature');
    }
  });

  const completedCount = () => tasks().filter(t => t.status === 'done').length;

  const handleTaskClick = (task: TaskInfo) => {
    hive.navigate('spec', task.folder);
  };

  return (
    <box flexDirection="column">
      <Header feature={hive.feature} status={status()} />
      
      {error() ? (
        <text fg="red">Error: {error()}</text>
      ) : (
        <>
          <ProgressBar completed={completedCount()} total={tasks().length} />
          
          <box marginTop={1} borderStyle="single" paddingLeft={1} paddingRight={1}>
            <TaskList 
              tasks={tasks()} 
              onTaskClick={handleTaskClick}
              selectedTask={hive.selectedTask}
            />
          </box>
        </>
      )}
      
      <box marginTop={1} borderStyle="single" paddingLeft={1}>
        <text fg="gray">[p] plan  [s] spec  [f] feature  [q] quit</text>
      </box>
    </box>
  );
}
