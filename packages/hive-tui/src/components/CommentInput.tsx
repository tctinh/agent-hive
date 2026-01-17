import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface CommentInputProps {
  line: number;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

export function CommentInput({ line, onSubmit, onCancel }: CommentInputProps) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = (val: string) => {
    if (val.trim()) {
      onSubmit(val.trim());
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
      <Text color="yellow">Add comment at line {line}:</Text>
      <Box>
        <Text color="green">&gt; </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="Type your comment..."
        />
      </Box>
      <Text dimColor>[Enter] save  [Esc] cancel</Text>
    </Box>
  );
}
