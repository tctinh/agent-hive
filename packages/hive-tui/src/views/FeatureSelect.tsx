import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { FeatureService } from 'hive-core';
import type { FeatureInfo } from 'hive-core';

interface FeatureSelectProps {
  projectRoot: string;
  currentFeature: string | null;
  onSelect: (name: string) => void;
  onCancel?: () => void;
}

const STATUS_ICONS: Record<string, string> = {
  planning: '📝',
  approved: '✅',
  executing: '🔄',
  completed: '🏁',
};

export function FeatureSelect({ projectRoot, currentFeature, onSelect, onCancel }: FeatureSelectProps) {
  const [features, setFeatures] = useState<FeatureInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const featureService = new FeatureService(projectRoot);
        const names = featureService.list();
        const infos = names
          .map(name => featureService.getInfo(name))
          .filter((info): info is FeatureInfo => info !== null);
        setFeatures(infos);
        
        // Set initial selection to current feature
        if (currentFeature) {
          const idx = names.indexOf(currentFeature);
          if (idx >= 0) setSelectedIndex(idx);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectRoot, currentFeature]);

  useInput((input, key) => {
    if (key.escape && onCancel) {
      onCancel();
    } else if (key.return && features.length > 0) {
      onSelect(features[selectedIndex].name);
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(i => Math.min(features.length - 1, i + 1));
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading features...</Text>
      </Box>
    );
  }

  if (features.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No features found.</Text>
        <Text dimColor>Create one with hive_feature_create</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" paddingX={1}>
        <Text>🐝 SELECT FEATURE</Text>
        {onCancel && <Text dimColor>  [Esc] cancel</Text>}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {features.map((f, i) => {
          const isSelected = i === selectedIndex;
          const icon = STATUS_ICONS[f.status] || '⏳';
          const taskCount = Array.isArray(f.tasks) ? f.tasks.length : 0;
          
          return (
            <Box key={f.name}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '> ' : '  '}
                {icon} {f.name}
                <Text dimColor> ({taskCount} tasks)</Text>
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>↑↓ select  [Enter] switch  {onCancel ? '[Esc] cancel' : ''}</Text>
      </Box>
    </Box>
  );
}
