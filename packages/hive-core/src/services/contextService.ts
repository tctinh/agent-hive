import * as fs from 'fs';
import * as path from 'path';
import { getContextPath, ensureDir, fileExists, readText, writeText } from '../utils/paths.js';
import type { ContextFile } from '../types.js';

export class ContextService {
  constructor(private projectRoot: string) {}

  write(featureName: string, fileName: string, content: string): string {
    const contextPath = getContextPath(this.projectRoot, featureName);
    ensureDir(contextPath);

    const filePath = path.join(contextPath, this.normalizeFileName(fileName));
    writeText(filePath, content);
    
    // Check total size and warn if exceeding 20,000 chars
    const totalChars = this.list(featureName).reduce((sum, c) => sum + c.content.length, 0);
    if (totalChars > 20000) {
      return `${filePath}\n\n⚠️ Context total: ${totalChars} chars (exceeds 20,000). Consider archiving older contexts with contextService.archive().`;
    }
    
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

  archive(featureName: string): { archived: string[]; archivePath: string } {
    const contexts = this.list(featureName);
    if (contexts.length === 0) return { archived: [], archivePath: '' };
    
    const contextPath = getContextPath(this.projectRoot, featureName);
    const archiveDir = path.join(contextPath, '..', 'archive');
    ensureDir(archiveDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archived: string[] = [];
    
    for (const ctx of contexts) {
      const archiveName = `${timestamp}_${ctx.name}.md`;
      const src = path.join(contextPath, `${ctx.name}.md`);
      const dest = path.join(archiveDir, archiveName);
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
      archived.push(ctx.name);
    }
    
    return { archived, archivePath: archiveDir };
  }

  stats(featureName: string): { count: number; totalChars: number; oldest?: string; newest?: string } {
    const contexts = this.list(featureName);
    if (contexts.length === 0) return { count: 0, totalChars: 0 };
    
    const sorted = [...contexts].sort((a, b) => 
      new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );
    
    return {
      count: contexts.length,
      totalChars: contexts.reduce((sum, c) => sum + c.content.length, 0),
      oldest: sorted[0].name,
      newest: sorted[sorted.length - 1].name,
    };
  }

  private normalizeFileName(name: string): string {
    const normalized = name.replace(/\.md$/, '');
    return `${normalized}.md`;
  }
}
