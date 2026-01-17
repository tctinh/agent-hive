/**
 * App - Main app shell with keyboard handling and view routing
 */
import { Switch, Match } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { useHive, type ViewType } from './context/hive';
import { Dashboard } from './views/dashboard';
import { PlanViewer } from './views/plan-viewer';
import { SpecViewer } from './views/spec-viewer';
import { FeatureSelect } from './views/feature-select';

export function App() {
  const hive = useHive();
  const dimensions = useTerminalDimensions();

  // Global keyboard handler
  useKeyboard((evt) => {
    // Number keys to switch views
    if (evt.name === '1' || evt.name === 'd') {
      hive.setView('dashboard');
    } else if (evt.name === '2' || evt.name === 'p') {
      hive.setView('plan');
    } else if (evt.name === '3' || evt.name === 's') {
      hive.setView('spec');
    } else if (evt.name === '4' || evt.name === 'f') {
      hive.setView('features');
    } else if (evt.name === 'q') {
      process.exit(0);
    } else if (evt.name === 'escape') {
      hive.setView('dashboard');
    }
  });

  return (
    <box
      flexDirection="column"
      width={dimensions().width}
      height={dimensions().height}
    >
      <Switch fallback={<Dashboard />}>
        <Match when={hive.view === 'dashboard'}>
          <Dashboard />
        </Match>
        <Match when={hive.view === 'plan'}>
          <PlanViewer />
        </Match>
        <Match when={hive.view === 'spec'}>
          <SpecViewer />
        </Match>
        <Match when={hive.view === 'features'}>
          <FeatureSelect />
        </Match>
      </Switch>
    </box>
  );
}
