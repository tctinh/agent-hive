/**
 * File watcher hook - watches .hive directory for changes and triggers refresh
 * Uses chokidar for efficient file system watching
 */
import { createSignal, createEffect, onCleanup, Accessor } from 'solid-js';
import { watch, type FSWatcher } from 'chokidar';

export interface UseHiveWatcherOptions {
  /** Feature name to watch */
  feature: string;
  /** Project root directory */
  projectRoot: string;
  /** Debounce delay in ms (default: 100) */
  debounce?: number;
}

/**
 * Watch the .hive/features/<feature> directory for changes
 * Returns a refresh key that increments on each change
 */
export function useHiveWatcher(
  feature: Accessor<string>,
  projectRoot: Accessor<string>,
  debounce = 100
): Accessor<number> {
  const [refreshKey, setRefreshKey] = createSignal(0);

  createEffect(() => {
    const featureName = feature();
    const root = projectRoot();
    
    if (!featureName || !root) return;

    const featurePath = `${root}/.hive/features/${featureName}`;
    
    // Watch plan.md, tasks/, and context/
    const watchPaths = [
      `${featurePath}/plan.md`,
      `${featurePath}/plan.comments.json`,
      `${featurePath}/tasks/**/*`,
      `${featurePath}/context/**/*`,
    ];

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    const watcher: FSWatcher = watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      // Don't follow symlinks to avoid watching worktrees recursively
      followSymlinks: false,
    });

    const handleChange = () => {
      // Debounce multiple rapid changes
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setRefreshKey(k => k + 1);
      }, debounce);
    };

    watcher.on('add', handleChange);
    watcher.on('change', handleChange);
    watcher.on('unlink', handleChange);

    onCleanup(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher.close();
    });
  });

  return refreshKey;
}
