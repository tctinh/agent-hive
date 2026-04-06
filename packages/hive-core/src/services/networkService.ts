import * as fs from 'fs';
import * as path from 'path';
import type { ContextFile } from '../types.js';
import { getPlanPath, readText, listFeatureDirectories } from '../utils/paths.js';
import { ContextService } from './contextService.js';

export interface NetworkQueryOptions {
  currentFeature?: string;
  query: string;
  maxFeatures: number;
  maxSnippetsPerFeature: number;
  maxSnippetChars: number;
}

export interface NetworkQueryResult {
  feature: string;
  sourceType: 'plan' | 'context';
  sourceName: string;
  path: string;
  updatedAt: string;
  snippet: string;
}

interface MatchCandidate extends NetworkQueryResult {
  sortRank: number;
}

export class NetworkService {
  private readonly contextService: ContextService;

  constructor(private readonly projectRoot: string) {
    this.contextService = new ContextService(projectRoot);
  }

  query(options: NetworkQueryOptions): NetworkQueryResult[] {
    const normalizedQuery = normalizeText(options.query);
    if (!normalizedQuery) {
      return [];
    }

    const matchingFeatures = listFeatureDirectories(this.projectRoot)
      .map((entry) => entry.logicalName)
      .filter((featureName) => featureName !== options.currentFeature)
      .sort((left, right) => left.localeCompare(right))
      .map((featureName) => ({
        featureName,
        matches: this.collectMatches(featureName, normalizedQuery, options),
      }))
      .filter((entry) => entry.matches.length > 0)
      .slice(0, options.maxFeatures);

    return matchingFeatures.flatMap((entry) => entry.matches);
  }

  private collectMatches(featureName: string, normalizedQuery: string, options: NetworkQueryOptions): NetworkQueryResult[] {
    const candidates: MatchCandidate[] = [];
    const planMatch = this.matchPlan(featureName, normalizedQuery, options.maxSnippetChars);
    if (planMatch) {
      candidates.push(planMatch);
    }

    const contextMatches = this.contextService.listNetworkContext(featureName)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((contextFile) => this.matchContext(featureName, contextFile, normalizedQuery, options.maxSnippetChars))
      .filter((result): result is MatchCandidate => result !== null);

    candidates.push(...contextMatches);

    return candidates
      .sort((left, right) => {
        if (left.sortRank !== right.sortRank) {
          return left.sortRank - right.sortRank;
        }
        return left.sourceName.localeCompare(right.sourceName);
      })
      .slice(0, options.maxSnippetsPerFeature)
      .map(({ sortRank: _sortRank, ...result }) => result);
  }

  private matchPlan(featureName: string, normalizedQuery: string, maxSnippetChars: number): MatchCandidate | null {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const content = readText(planPath);
    if (content === null) {
      return null;
    }

    const snippet = extractSnippet(content, normalizedQuery, maxSnippetChars);
    if (!snippet) {
      return null;
    }

    const stat = fs.statSync(planPath);

    return {
      feature: featureName,
      sourceType: 'plan',
      sourceName: 'plan.md',
      path: planPath,
      updatedAt: stat.mtime.toISOString(),
      snippet,
      sortRank: 0,
    };
  }

  private matchContext(featureName: string, contextFile: ContextFile, normalizedQuery: string, maxSnippetChars: number): MatchCandidate | null {
    const snippet = extractSnippet(contextFile.content, normalizedQuery, maxSnippetChars);
    if (!snippet) {
      return null;
    }

    return {
      feature: featureName,
      sourceType: 'context',
      sourceName: contextFile.name,
      path: path.join(this.projectRoot, '.hive', 'features', this.resolveDirectoryName(featureName), 'context', `${contextFile.name}.md`),
      updatedAt: contextFile.updatedAt,
      snippet,
      sortRank: 1,
    };
  }

  private resolveDirectoryName(featureName: string): string {
    const match = listFeatureDirectories(this.projectRoot).find((entry) => entry.logicalName === featureName);
    return match?.directoryName ?? featureName;
  }
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractSnippet(content: string, normalizedQuery: string, maxSnippetChars: number): string | null {
  const normalizedContent = content.replace(/\s+/g, ' ').trim();
  const matchIndex = normalizedContent.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return null;
  }

  return normalizedContent.slice(matchIndex, matchIndex + maxSnippetChars).trim();
}
