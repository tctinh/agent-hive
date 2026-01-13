import * as fs from 'fs';
import * as path from 'path';

export interface Ask {
  id: string;
  question: string;
  feature: string;
  timestamp: string;
  answered: boolean;
}

export interface AskAnswer {
  id: string;
  answer: string;
  timestamp: string;
}

export class AskService {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  private getAsksDir(feature: string): string {
    return path.join(this.projectRoot, '.hive', 'features', feature, 'asks');
  }

  private ensureAsksDir(feature: string): void {
    const dir = this.getAsksDir(feature);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  createAsk(feature: string, question: string): Ask {
    this.ensureAsksDir(feature);
    
    const id = `ask_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ask: Ask = {
      id,
      question,
      feature,
      timestamp: new Date().toISOString(),
      answered: false
    };

    const asksDir = this.getAsksDir(feature);
    const askPath = path.join(asksDir, `${id}.json`);
    const lockPath = path.join(asksDir, `${id}.lock`);

    fs.writeFileSync(askPath, JSON.stringify(ask, null, 2));
    fs.writeFileSync(lockPath, '');

    return ask;
  }

  isLocked(feature: string, askId: string): boolean {
    const lockPath = path.join(this.getAsksDir(feature), `${askId}.lock`);
    return fs.existsSync(lockPath);
  }

  getAnswer(feature: string, askId: string): AskAnswer | null {
    const answerPath = path.join(this.getAsksDir(feature), `${askId}-answer.json`);
    if (!fs.existsSync(answerPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(answerPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  submitAnswer(feature: string, askId: string, answer: string): void {
    const asksDir = this.getAsksDir(feature);
    const answerPath = path.join(asksDir, `${askId}-answer.json`);
    const lockPath = path.join(asksDir, `${askId}.lock`);

    const answerData: AskAnswer = {
      id: askId,
      answer,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(answerPath, JSON.stringify(answerData, null, 2));
    
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  }

  listPending(feature: string): Ask[] {
    const asksDir = this.getAsksDir(feature);
    if (!fs.existsSync(asksDir)) {
      return [];
    }

    const files = fs.readdirSync(asksDir);
    const pending: Ask[] = [];

    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-answer')) {
        const askPath = path.join(asksDir, file);
        const askId = file.replace('.json', '');
        const lockPath = path.join(asksDir, `${askId}.lock`);

        if (fs.existsSync(lockPath)) {
          try {
            const ask = JSON.parse(fs.readFileSync(askPath, 'utf-8'));
            pending.push(ask);
          } catch { /* skip malformed */ }
        }
      }
    }

    return pending.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  cleanup(feature: string, askId: string): void {
    const asksDir = this.getAsksDir(feature);
    const askPath = path.join(asksDir, `${askId}.json`);
    const answerPath = path.join(asksDir, `${askId}-answer.json`);
    const lockPath = path.join(asksDir, `${askId}.lock`);

    for (const p of [askPath, answerPath, lockPath]) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  }
}
