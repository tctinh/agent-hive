import * as fs from 'fs';
import * as path from 'path';

const EXTENSION_ID = 'tctinh.vscode-hive';

type QuickPickOption = { label: string; description?: string };

interface VscodeApi {
  window: {
    showQuickPick(
      items: QuickPickOption[],
      options: { title: string },
    ): Promise<QuickPickOption | undefined>;
    showInformationMessage(message: string): Promise<unknown>;
  };
}

interface RegenerateAgentsDependencies {
  vscodeApi?: VscodeApi;
  generateAgents?: () => Array<{ filename: string; content: string }>;
}

async function loadVscode(): Promise<VscodeApi> {
  return await import('vscode') as unknown as VscodeApi;
}

async function loadGenerateAgents(): Promise<() => Array<{ filename: string; content: string }>> {
  const { generateAllAgents } = await import('../generators/agents.js');
  return () => generateAllAgents({ extensionId: EXTENSION_ID });
}

export async function regenerateAgents(
  workspaceRoot: string,
  deps: RegenerateAgentsDependencies = {},
): Promise<void> {
  const vscode = deps.vscodeApi ?? await loadVscode();
  const generateAgents = deps.generateAgents ?? await loadGenerateAgents();

  const confirm = await vscode.window.showQuickPick(
    [
      { label: 'Regenerate agents', description: 'Overwrite all agent files with latest templates' },
      { label: 'Cancel', description: 'Do nothing' },
    ],
    { title: 'Regenerate Hive Agents' },
  );

  if (!confirm || confirm.label === 'Cancel') {
    return;
  }

  const agents = generateAgents();
  const agentsDir = path.join(workspaceRoot, '.github', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const existingFiles = fs.readdirSync(agentsDir).filter((filename) => filename.endsWith('.agent.md'));
  for (const filename of existingFiles) {
    fs.unlinkSync(path.join(agentsDir, filename));
  }

  for (const agent of agents) {
    fs.writeFileSync(path.join(agentsDir, agent.filename), agent.content);
  }

  await vscode.window.showInformationMessage(`Hive: Regenerated ${agents.length} agents`);
}
