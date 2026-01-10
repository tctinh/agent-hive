import * as fs from 'fs';
import * as path from 'path';
import { getContextPath, ensureDir, fileExists, readText, writeText } from '../utils/paths.js';

export interface ContextFile {
  name: string;
  content: string;
  updatedAt: string;
}

export class ContextService {
  constructor(private projectRoot: string) {}

  write(featureName: string, fileName: string, content: string): string {
    const contextPath = getContextPath(this.projectRoot, featureName);
    ensureDir(contextPath);

    const filePath = path.join(contextPath, this.normalizeFileName(fileName));
    writeText(filePath, content);
    return filePath;
  }

  read(featureName: string, fileName: string): string | null {
    const contextPath = getContextPath(this.projectRoot, featureName);
    const filePath = path.join(contextPath, this.normalizeFileName(fileName));
    return readText(filePath);
  }

  list(featureName: string): ContextFile[] {
    const contextPath = getContextPath(this.projectRoot, featureName);
    if (!fileExists(contextPath)) return [];

    const files = fs.readdirSync(contextPath, { withFileTypes: true })
      .filter(f => f.isFile() && f.name.endsWith('.md'))
      .map(f => f.name);

    return files.map(name => {
      const filePath = path.join(contextPath, name);
      const stat = fs.statSync(filePath);
      const content = readText(filePath) || '';
      return {
        name: name.replace(/\.md$/, ''),
        content,
        updatedAt: stat.mtime.toISOString(),
      };
    });
  }

  delete(featureName: string, fileName: string): boolean {
    const contextPath = getContextPath(this.projectRoot, featureName);
    const filePath = path.join(contextPath, this.normalizeFileName(fileName));
    
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  compile(featureName: string): string {
    const files = this.list(featureName);
    if (files.length === 0) return '';

    const sections = files.map(f => `## ${f.name}\n\n${f.content}`);
    return sections.join('\n\n---\n\n');
  }

  private normalizeFileName(name: string): string {
    const normalized = name.replace(/\.md$/, '');
    return `${normalized}.md`;
  }
}
