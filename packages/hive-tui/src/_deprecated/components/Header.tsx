import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureInfo } from 'hive-core';

interface HeaderProps {
  feature: FeatureInfo;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planning: { label: 'planning', color: 'yellow' },
  approved: { label: 'approved', color: 'green' },
  executing: { label: 'executing', color: 'blue' },
  completed: { label: 'completed', color: 'gray' },
};

export function Header({ feature }: HeaderProps) {
  const statusInfo = STATUS_LABELS[feature.status] || { label: feature.status, color: 'white' };

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text>🐝 HIVE │ </Text>
      <Text color="cyan" bold>{feature.name}</Text>
      <Text> │ </Text>
      <Text color={statusInfo.color as any}>{statusInfo.label}</Text>
      <Text dimColor>  [f] switch</Text>
    </Box>
  );
}
