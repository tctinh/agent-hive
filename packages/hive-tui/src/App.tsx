import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { FeatureService, findProjectRoot } from 'hive-core';
import { Dashboard } from './views/Dashboard.js';
import { PlanViewer } from './views/PlanViewer.js';
import { SpecViewer } from './views/SpecViewer.js';
import { FeatureSelect } from './views/FeatureSelect.js';

type View = 'dashboard' | 'plan' | 'spec' | 'feature-select';

interface AppProps {
  initialFeature?: string;
}

export function App({ initialFeature }: AppProps) {
  const { exit } = useApp();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [feature, setFeature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectRoot, setProjectRoot] = useState<string | null>(null);

  // Initialize project root and feature on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Find project root
        const root = findProjectRoot(process.cwd());
        if (!root) {
          setError('Could not find .hive directory. Run from within a Hive project.');
          return;
        }
        setProjectRoot(root);

        const featureService = new FeatureService(root);

        if (initialFeature) {
          // Validate feature exists
          const info = featureService.getInfo(initialFeature);
          if (info) {
            setFeature(initialFeature);
          } else {
            setError(`Feature "${initialFeature}" not found`);
          }
        } else {
          // Try to get active feature
          const active = featureService.getActive();
          if (active) {
            setFeature(active.name);
          } else {
            // Show feature selector if no active feature
            setCurrentView('feature-select');
          }
        }
      } catch (err) {
        setError(String(err));
      }
    };
    init();
  }, [initialFeature]);

  // Global keyboard handler
  useInput((input, key) => {
    // Only handle global keys when on dashboard
    if (currentView === 'dashboard') {
      if (input === 'q') {
        exit();
      } else if (input === 'p' && feature) {
        setCurrentView('plan');
      } else if (input === 's' && feature) {
        setCurrentView('spec');
      } else if (input === 'f') {
        setCurrentView('feature-select');
      }
    }
  });

  const handleBack = () => {
    setCurrentView('dashboard');
  };

  const handleFeatureSelect = (name: string) => {
    setFeature(name);
    setCurrentView('dashboard');
  };

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  // Loading state
  if (!projectRoot || (!feature && currentView !== 'feature-select')) {
    return (
      <Box padding={1}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  // Render current view
  switch (currentView) {
    case 'plan':
      return <PlanViewer feature={feature!} projectRoot={projectRoot} onBack={handleBack} />;
    case 'spec':
      return <SpecViewer feature={feature!} projectRoot={projectRoot} onBack={handleBack} />;
    case 'feature-select':
      return (
        <FeatureSelect
          projectRoot={projectRoot}
          currentFeature={feature}
          onSelect={handleFeatureSelect}
          onCancel={feature ? handleBack : undefined}
        />
      );
    case 'dashboard':
    default:
      return <Dashboard feature={feature!} projectRoot={projectRoot} />;
  }
}
