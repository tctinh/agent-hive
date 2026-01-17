/**
 * SpecViewer - View task specs with clickable task selector
 */
import { createSignal, createEffect, For, type JSX, Show } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { taskService } from 'hive-core';
import { useHive } from '../context/hive';

interface TaskInfo {
  folder: string;
  status: string;
}

export function SpecViewer(): JSX.Element {
  const hive = useHive();
  const dimensions = useTerminalDimensions();
  
  const [tasks, setTasks] = createSignal<TaskInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [specContent, setSpecContent] = createSignal<string>('');
  const [scrollOffset, setScrollOffset] = createSignal(0);

  // Calculate visible lines
  const visibleLines = () => Math.max(5, dimensions().height - 12);
  const specLines = () => specContent().split('\n');
  const visibleSpec = () => specLines().slice(scrollOffset(), scrollOffset() + visibleLines());

  // Load tasks
  createEffect(() => {
    const feature = hive.feature;
    if (!feature) return;

    try {
      const taskList = taskService.list(feature, hive.projectRoot);
      setTasks(taskList);
      
      // If selectedTask is set, find its index
      if (hive.selectedTask) {
        const idx = taskList.findIndex((t: TaskInfo) => t.folder === hive.selectedTask);
        if (idx >= 0) setSelectedIndex(idx);
      }
    } catch (e) {
      setTasks([]);
    }
  });

  // Load spec for selected task
  createEffect(() => {
    const taskList = tasks();
    if (taskList.length === 0) {
      setSpecContent('# No tasks found');
      return;
    }

    const task = taskList[selectedIndex()];
    if (!task) return;

    try {
      const spec = taskService.getSpec?.(hive.feature, task.folder, hive.projectRoot);
      setSpecContent(spec || `# No spec.md for ${task.folder}`);
      setScrollOffset(0);
    } catch (e) {
      setSpecContent(`# Error loading spec for ${task.folder}`);
    }
  });

  // Keyboard navigation
  useKeyboard((evt) => {
    if (evt.name === 'escape') {
      hive.setView('dashboard');
    } else if (evt.name === 'left') {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (evt.name === 'right') {
      setSelectedIndex(i => Math.min(tasks().length - 1, i + 1));
    } else if (evt.name === 'up' || evt.name === 'k') {
      setScrollOffset(o => Math.max(0, o - 1));
    } else if (evt.name === 'down' || evt.name === 'j') {
      setScrollOffset(o => Math.min(specLines().length - visibleLines(), o + 1));
    } else if (evt.name === 'pageup') {
      setScrollOffset(o => Math.max(0, o - visibleLines()));
    } else if (evt.name === 'pagedown') {
      setScrollOffset(o => Math.min(specLines().length - visibleLines(), o + visibleLines()));
    }
  });

  const handleTaskClick = (index: number) => {
    setSelectedIndex(index);
  };

  const currentTask = () => tasks()[selectedIndex()];

  return (
    <box flexDirection="column">
      {/* Header */}
      <box borderStyle="single" paddingLeft={1}>
        <text>📋 SPEC </text>
        <text fg="cyan"><b>{currentTask()?.folder || 'No task'}</b></text>
        <text fg="gray"> [{selectedIndex() + 1}/{tasks().length}]</text>
        <text fg="gray">  [←→] task [Esc] back</text>
      </box>

      {/* Task selector */}
      <box marginTop={1} flexDirection="column">
        <For each={tasks()}>
          {(task, idx) => {
            const match = task.folder.match(/^(\d+)-(.+)$/);
            const num = match ? match[1] : String(idx() + 1).padStart(2, '0');
            const name = match ? match[2].replace(/-/g, ' ') : task.folder;
            const displayName = name.length > 40 ? name.slice(0, 39) + '…' : name;
            const isSelected = () => idx() === selectedIndex();

            return (
              <box onMouseDown={() => handleTaskClick(idx())}>
                <text
                  fg={isSelected() ? 'cyan' : 'gray'}
                  backgroundColor={isSelected() ? 'blue' : undefined}
                >
                  {isSelected() ? '▶' : ' '} {num}. {displayName}
                </text>
              </box>
            );
          }}
        </For>
      </box>

      {/* Spec content */}
      <box flexDirection="column" marginTop={1} borderStyle="single" paddingLeft={1} flexGrow={1}>
        <For each={visibleSpec()}>
          {(line, idx) => {
            const lineNum = () => scrollOffset() + idx() + 1;
            return (
              <box>
                <text fg="gray">{String(lineNum()).padStart(3, ' ')}│</text>
                <text>{line || ' '}</text>
              </box>
            );
          }}
        </For>
        <Show when={specLines().length > visibleLines()}>
          <text fg="gray">
            ── {scrollOffset() + 1}-{Math.min(scrollOffset() + visibleLines(), specLines().length)}/{specLines().length} ──
          </text>
        </Show>
      </box>

      {/* Footer */}
      <box borderStyle="single" paddingLeft={1}>
        <text fg="gray">←→ switch task  ↑↓/jk scroll  [Esc] back</text>
      </box>
    </box>
  );
}
