/**
 * App - Main app shell with keyboard handling and view routing
 */
import { Switch, Match } from 'solid-js';
import { useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { useHive, type ViewType } from './context/hive';

// Placeholder views - will be replaced in later tasks
function Dashboard() {
  return <text>Dashboard - Press 2 for Plan, 3 for Spec, 4 for Features, q to quit</text>;
}

function PlanViewer() {
  return <text>Plan Viewer - Press 1 for Dashboard, Esc to go back</text>;
}

function SpecViewer() {
  return <text>Spec Viewer - Press 1 for Dashboard, Esc to go back</text>;
}

function FeatureSelect() {
  return <text>Feature Select - Press 1 for Dashboard, Esc to go back</text>;
}

export function App() {
  const hive = useHive();
  const dimensions = useTerminalDimensions();

  // Global keyboard handler
  useKeyboard((evt) => {
    // Number keys to switch views
    if (evt.name === '1') {
      hive.setView('dashboard');
    } else if (evt.name === '2') {
      hive.setView('plan');
    } else if (evt.name === '3') {
      hive.setView('spec');
    } else if (evt.name === '4') {
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
