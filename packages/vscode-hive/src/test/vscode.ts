export const progressCalls: Array<{ options: unknown; reports: unknown[] }> = [];
export const infoMessages: string[] = [];

export const ProgressLocation = {
  Notification: 15,
};

export const window = {
  async withProgress<T>(options: unknown, task: (progress: { report: (value: unknown) => void }) => Promise<T> | T): Promise<T> {
    const reports: unknown[] = [];
    progressCalls.push({ options, reports });
    return await task({
      report(value: unknown): void {
        reports.push(value);
      },
    });
  },
  async showInformationMessage(message: string): Promise<string> {
    infoMessages.push(message);
    return message;
  },
};

export function resetVscodeTestState(): void {
  progressCalls.length = 0;
  infoMessages.length = 0;
}
