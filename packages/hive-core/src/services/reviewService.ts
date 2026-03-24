import {
  getCommentsPath,
  getReviewCommentsPath,
  writeJson,
  readJson,
  fileExists,
} from '../utils/paths.js';
import type { CommentsJson, ReviewCounts, ReviewDocument, ReviewThread } from '../types.js';

const EMPTY_COUNTS: ReviewCounts = {
  plan: 0,
  overview: 0,
};

export class ReviewService {
  constructor(private projectRoot: string) {}

  getThreads(featureName: string, document: ReviewDocument): ReviewThread[] {
    const data = this.readComments(featureName, document);
    return data?.threads ?? [];
  }

  saveThreads(featureName: string, document: ReviewDocument, threads: ReviewThread[]): void {
    writeJson(this.getCanonicalPath(featureName, document), { threads });
  }

  clear(featureName: string, document: ReviewDocument): void {
    this.saveThreads(featureName, document, []);

    if (document === 'plan' && fileExists(getCommentsPath(this.projectRoot, featureName))) {
      writeJson(getCommentsPath(this.projectRoot, featureName), { threads: [] });
    }
  }

  countByDocument(featureName: string): ReviewCounts {
    return {
      plan: this.getThreads(featureName, 'plan').length,
      overview: this.getThreads(featureName, 'overview').length,
    };
  }

  hasUnresolvedThreads(featureName: string, document?: ReviewDocument): boolean {
    if (document) {
      return this.getThreads(featureName, document).length > 0;
    }

    const counts = this.countByDocument(featureName);
    return counts.plan > 0 || counts.overview > 0;
  }

  private readComments(featureName: string, document: ReviewDocument): CommentsJson | null {
    const canonicalPath = this.getCanonicalPath(featureName, document);
    const canonical = readJson<CommentsJson>(canonicalPath);
    if (canonical) {
      return canonical;
    }

    if (document === 'plan') {
      return readJson<CommentsJson>(getCommentsPath(this.projectRoot, featureName));
    }

    return null;
  }

  private getCanonicalPath(featureName: string, document: ReviewDocument): string {
    return getReviewCommentsPath(this.projectRoot, featureName, document);
  }
}
