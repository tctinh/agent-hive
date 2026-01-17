/**
 * FeatureSelect - Select a feature from the list
 */
import { createSignal, createEffect, For, type JSX } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import { featureService } from 'hive-core';
import { useHive } from '../context/hive';

export function FeatureSelect(): JSX.Element {
  const hive = useHive();
  
  const [features, setFeatures] = createSignal<string[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);

  // Load features
  createEffect(() => {
    try {
      const featureList = featureService.list(hive.projectRoot);
      setFeatures(featureList);
      
      // Select current feature if it exists
      const currentIdx = featureList.indexOf(hive.feature);
      if (currentIdx >= 0) setSelectedIndex(currentIdx);
    } catch (e: any) {
      setError(e.message || 'Failed to load features');
    }
  });

  // Keyboard navigation
  useKeyboard((evt) => {
    if (evt.name === 'escape') {
      hive.setView('dashboard');
    } else if (evt.name === 'up' || evt.name === 'k') {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (evt.name === 'down' || evt.name === 'j') {
      setSelectedIndex(i => Math.min(features().length - 1, i + 1));
    } else if (evt.name === 'return') {
      const selected = features()[selectedIndex()];
      if (selected) {
        hive.setFeature(selected);
        hive.setView('dashboard');
      }
    }
  });

  const handleFeatureClick = (index: number) => {
    setSelectedIndex(index);
    const selected = features()[index];
    if (selected) {
      hive.setFeature(selected);
      hive.setView('dashboard');
    }
  };

  return (
    <box flexDirection="column">
      {/* Header */}
      <box borderStyle="single" paddingLeft={1}>
        <text>🐝 SELECT FEATURE</text>
        <text fg="gray">  Current: </text>
        <text fg="cyan">{hive.feature}</text>
        <text fg="gray">  [Esc] back</text>
      </box>

      {/* Feature list */}
      <box flexDirection="column" marginTop={1} borderStyle="single" paddingLeft={1}>
        {error() ? (
          <text fg="red">Error: {error()}</text>
        ) : features().length === 0 ? (
          <text fg="gray">No features found. Create one with hive_feature_create.</text>
        ) : (
          <For each={features()}>
            {(feature, idx) => {
              const isSelected = () => idx() === selectedIndex();
              const isCurrent = () => feature === hive.feature;

              return (
                <box onMouseDown={() => handleFeatureClick(idx())}>
                  <text
                    fg={isSelected() ? 'cyan' : isCurrent() ? 'green' : undefined}
                    backgroundColor={isSelected() ? 'blue' : undefined}
                  >
                    {isSelected() ? '▶' : ' '} {feature} {isCurrent() ? '(current)' : ''}
                  </text>
                </box>
              );
            }}
          </For>
        )}
      </box>

      {/* Footer */}
      <box marginTop={1} borderStyle="single" paddingLeft={1}>
        <text fg="gray">↑↓/jk navigate  [Enter] or click to select  [Esc] back</text>
      </box>
    </box>
  );
}
