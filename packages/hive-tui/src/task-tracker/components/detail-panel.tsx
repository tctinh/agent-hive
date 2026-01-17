/**
 * DetailPanel - Shows task spec or report content
 */
import type { JSX } from 'solid-js';

export interface DetailPanelProps {
  type: 'spec' | 'report';
  content: string;
  taskName: string;
}

export function DetailPanel(props: DetailPanelProps): JSX.Element {
  const title = () => props.type === 'spec' ? '📄 Spec' : '📝 Report';
  
  // Split content into lines for display
  const lines = () => props.content.split('\n');

  return (
    <box 
      flexDirection="column" 
      flexGrow={1}
      borderStyle="single"
      marginLeft={1}
    >
      {/* Panel header */}
      <box paddingLeft={1}>
        <text fg="cyan">{title()}</text>
        <text fg="gray">: {props.taskName}</text>
      </box>

      {/* Content */}
      <box flexDirection="column" paddingLeft={1} flexGrow={1}>
        {lines().slice(0, 20).map((line, idx) => (
          <text fg={line.startsWith('#') ? 'yellow' : 'white'}>{line || ' '}</text>
        ))}
        {lines().length > 20 && (
          <text fg="gray">... ({lines().length - 20} more lines)</text>
        )}
      </box>

      {/* Tab hint */}
      <box paddingLeft={1}>
        <text fg="gray">[Tab] switch to {props.type === 'spec' ? 'report' : 'spec'}</text>
      </box>
    </box>
  );
}
