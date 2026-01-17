/**
 * Task Tracker App - Main component for the Task Tracker TUI
 */
import { createSignal, createEffect, For, Show, type JSX } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { TaskService, type TaskInfo } from 'hive-core';
import { Header, useFileWatcher } from '../shared';
import { TaskRow } from './components/task-row';
import { DetailPanel } from './components/detail-panel';

export interface AppProps {
  feature: string;
  projectRoot: string;
}

// Task with additional display state
interface TaskItem extends TaskInfo {
  hasSpec: boolean;
  hasReport: boolean;
}

export function App(props: AppProps): JSX.Element {
  const dimensions = useTerminalDimensions();
  
  // State
  const [tasks, setTasks] = createSignal<TaskItem[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [showDetail, setShowDetail] = createSignal(false);
  const [detailType, setDetailType] = createSignal<'spec' | 'report'>('spec');
  const [detailContent, setDetailContent] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);

  // File watcher for auto-refresh
  const refreshKey = useFileWatcher(
    () => props.feature,
    () => props.projectRoot
  );

  // Calculate dimensions
  const visibleTasks = () => Math.max(3, dimensions().height - 8);
  const [scrollOffset, setScrollOffset] = createSignal(0);

  // Load tasks
  createEffect(() => {
    const _ = refreshKey(); // Track for reactivity
    
    try {
      const taskService = new TaskService(props.projectRoot);
      const taskList = taskService.list(props.feature);
      
      // Enrich with display info
      const enriched: TaskItem[] = taskList.map(t => ({
        ...t,
        hasSpec: !!taskService.readSpec(props.feature, t.folder),
        hasReport: false, // No readReport method, will check via paths later
      }));
      
      setTasks(enriched);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    }
  });

  // Load detail content when needed
  createEffect(() => {
    if (!showDetail()) return;
    
    const task = tasks()[selectedIndex()];
    if (!task) return;
    
    try {
      const taskService = new TaskService(props.projectRoot);
      const content = detailType() === 'spec'
        ? taskService.readSpec(props.feature, task.folder)
        : null; // Report reading to be added when API available
      
      setDetailContent(content || '(empty)');
    } catch {
      setDetailContent('(failed to load)');
    }
  });

  // Calculate progress
  const progress = () => {
    const all = tasks();
    if (all.length === 0) return { done: 0, inProgress: 0, pending: 0, total: 0, percent: 0 };
    
    const done = all.filter(t => t.status === 'done').length;
    const inProgress = all.filter(t => t.status === 'in_progress').length;
    const pending = all.filter(t => t.status === 'pending').length;
    
    return { done, inProgress, pending, total: all.length, percent: Math.round((done / all.length) * 100) };
  };

  // Navigation
  const moveUp = () => {
    setSelectedIndex(i => Math.max(0, i - 1));
    ensureVisible();
  };

  const moveDown = () => {
    setSelectedIndex(i => Math.min(tasks().length - 1, i + 1));
    ensureVisible();
  };

  const ensureVisible = () => {
    const idx = selectedIndex();
    const offset = scrollOffset();
    const visible = visibleTasks();
    
    if (idx < offset) setScrollOffset(idx);
    if (idx >= offset + visible) setScrollOffset(idx - visible + 1);
  };

  const toggleDetail = () => setShowDetail(s => !s);
  
  const switchDetailType = () => setDetailType(t => t === 'spec' ? 'report' : 'spec');

  // Keyboard handler
  useKeyboard((key, event) => {
    // Quit
    if (key === 'q' || (event.ctrl && key === 'c')) {
      process.exit(0);
    }

    // Navigation
    if (key === 'j' || key === 'down') moveDown();
    if (key === 'k' || key === 'up') moveUp();
    if (key === 'g') setSelectedIndex(0);
    if (key === 'G') setSelectedIndex(tasks().length - 1);
    
    // Detail panel
    if (key === 'enter' || key === 'space') toggleDetail();
    if (key === 'tab' && showDetail()) switchDetailType();
    if (key === 'escape') setShowDetail(false);
  });

  // Visible tasks slice
  const visibleTaskList = () => {
    const all = tasks();
    const offset = scrollOffset();
    const count = visibleTasks();
    return all.slice(offset, offset + count);
  };

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Header 
        icon="📋"
        title="Task Tracker"
        feature={props.feature}
        status={`${progress().percent}% (${progress().done}/${progress().total})`}
      />

      {/* Error display */}
      <Show when={error()}>
        <box borderStyle="single" paddingLeft={1}>
          <text fg="red">Error: {error()}</text>
        </box>
      </Show>

      {/* Progress bar */}
      <box paddingLeft={1}>
        <text fg="green">{'█'.repeat(Math.floor(progress().done / Math.max(1, progress().total) * 30))}</text>
        <text fg="yellow">{'█'.repeat(Math.floor(progress().inProgress / Math.max(1, progress().total) * 30))}</text>
        <text fg="gray">{'░'.repeat(30 - Math.floor(progress().done / Math.max(1, progress().total) * 30) - Math.floor(progress().inProgress / Math.max(1, progress().total) * 30))}</text>
        <text fg="gray"> {progress().done}✓ {progress().inProgress}⏳ {progress().pending}○</text>
      </box>

      {/* Main content area */}
      <box flexDirection="row" flexGrow={1}>
        {/* Task list */}
        <box flexDirection="column" flexGrow={showDetail() ? 0 : 1} width={showDetail() ? '50%' : '100%'}>
          <For each={visibleTaskList()}>
            {(task, index) => (
              <TaskRow
                task={task}
                isSelected={scrollOffset() + index() === selectedIndex()}
                onClick={() => setSelectedIndex(scrollOffset() + index())}
              />
            )}
          </For>
        </box>

        {/* Detail panel (spec or report) */}
        <Show when={showDetail()}>
          <DetailPanel
            type={detailType()}
            content={detailContent()}
            taskName={tasks()[selectedIndex()]?.name || ''}
          />
        </Show>
      </box>

      {/* Footer with keybindings */}
      <box borderStyle="single" paddingLeft={1}>
        <text fg="gray">j/k</text><text> navigate </text>
        <text fg="gray">Enter</text><text> toggle detail </text>
        <text fg="gray">Tab</text><text> spec/report </text>
        <text fg="gray">q</text><text> quit</text>
      </box>
    </box>
  );
}
