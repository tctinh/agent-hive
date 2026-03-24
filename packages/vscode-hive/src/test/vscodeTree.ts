type Listener<T> = (value: T) => void;

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
} as const;

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class TreeItem {
  description?: string;
  contextValue?: string;
  iconPath?: ThemeIcon;
  command?: { command: string; title: string; arguments?: unknown[] };
  resourceUri?: unknown;
  tooltip?: unknown;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: number
  ) {}
}

export class MarkdownString {
  value = '';

  appendMarkdown(text: string): void {
    this.value += text;
  }
}

export class EventEmitter<T> {
  private listeners: Listener<T>[] = [];

  readonly event = (listener: Listener<T>): { dispose: () => void } => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter(existing => existing !== listener);
      },
    };
  };

  fire(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

export class RelativePattern {
  constructor(
    public readonly base: string,
    public readonly pattern: string
  ) {}
}

type WatcherState = {
  pattern: RelativePattern;
  createListeners: Array<() => void>;
  changeListeners: Array<() => void>;
  deleteListeners: Array<() => void>;
  disposed: boolean;
};

const watcherStates: WatcherState[] = [];

class FakeFileSystemWatcher {
  constructor(private readonly state: WatcherState) {}

  onDidCreate(listener: () => void): void {
    this.state.createListeners.push(listener);
  }

  onDidChange(listener: () => void): void {
    this.state.changeListeners.push(listener);
  }

  onDidDelete(listener: () => void): void {
    this.state.deleteListeners.push(listener);
  }

  dispose(): void {
    this.state.disposed = true;
  }
}

export const workspace = {
  createFileSystemWatcher(pattern: RelativePattern): FakeFileSystemWatcher {
    const state: WatcherState = {
      pattern,
      createListeners: [],
      changeListeners: [],
      deleteListeners: [],
      disposed: false,
    };
    watcherStates.push(state);
    return new FakeFileSystemWatcher(state);
  },
};

export const Uri = {
  file(filePath: string): { fsPath: string } {
    return { fsPath: filePath };
  },
  parse(value: string): { path: string } {
    return { path: value };
  },
};

export function resetWatcherState(): void {
  watcherStates.length = 0;
}

export function getWatcherPatterns(): string[] {
  return watcherStates.map(state => state.pattern.pattern);
}

export function getWatcherStates(): Array<{
  pattern: string;
  createListeners: number;
  changeListeners: number;
  deleteListeners: number;
  disposed: boolean;
}> {
  return watcherStates.map(state => ({
    pattern: state.pattern.pattern,
    createListeners: state.createListeners.length,
    changeListeners: state.changeListeners.length,
    deleteListeners: state.deleteListeners.length,
    disposed: state.disposed,
  }));
}
