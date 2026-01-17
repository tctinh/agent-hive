/**
 * Hive context - feature and project root state
 */
import { createSignal } from 'solid-js';
import { createSimpleContext } from './helper';

export type ViewType = 'dashboard' | 'plan' | 'spec' | 'features';

export const { provider: HiveProvider, use: useHive } = createSimpleContext({
  name: 'Hive',
  init: () => {
    const [feature, setFeature] = createSignal<string>('');
    const [projectRoot, setProjectRoot] = createSignal<string>(process.cwd());
    const [view, setView] = createSignal<ViewType>('dashboard');
    const [selectedTask, setSelectedTask] = createSignal<string | null>(null);

    return {
      // Feature
      get feature() { return feature(); },
      setFeature,
      
      // Project root
      get projectRoot() { return projectRoot(); },
      setProjectRoot,
      
      // Current view
      get view() { return view(); },
      setView,
      
      // Selected task for spec viewer
      get selectedTask() { return selectedTask(); },
      setSelectedTask,
      
      // Navigate helper
      navigate(newView: ViewType, task?: string) {
        setView(newView);
        if (task !== undefined) setSelectedTask(task);
      },
    };
  },
});
