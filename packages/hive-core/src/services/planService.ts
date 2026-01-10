import {
  getPlanPath,
  getCommentsPath,
  getFeatureJsonPath,
  readJson,
  writeJson,
  readText,
  writeText,
  fileExists,
} from '../utils/paths.js';
import { FeatureJson, CommentsJson, PlanComment, PlanReadResult } from '../types.js';

export class PlanService {
  constructor(private projectRoot: string) {}

  write(featureName: string, content: string): string {
    const planPath = getPlanPath(this.projectRoot, featureName);
    writeText(planPath, content);
    
    this.clearComments(featureName);
    
    return planPath;
  }

  read(featureName: string): PlanReadResult | null {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const content = readText(planPath);
    
    if (content === null) return null;

    const feature = readJson<FeatureJson>(getFeatureJsonPath(this.projectRoot, featureName));
    const comments = this.getComments(featureName);

    return {
      content,
      status: feature?.status || 'planning',
      comments,
    };
  }

  approve(featureName: string): void {
    const featurePath = getFeatureJsonPath(this.projectRoot, featureName);
    const feature = readJson<FeatureJson>(featurePath);
    
    if (!feature) throw new Error(`Feature '${featureName}' not found`);
    if (!fileExists(getPlanPath(this.projectRoot, featureName))) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }

    feature.status = 'approved';
    feature.approvedAt = new Date().toISOString();
    writeJson(featurePath, feature);
  }

  getComments(featureName: string): PlanComment[] {
    const commentsPath = getCommentsPath(this.projectRoot, featureName);
    const data = readJson<CommentsJson>(commentsPath);
    return data?.threads || [];
  }

  addComment(featureName: string, comment: Omit<PlanComment, 'id' | 'timestamp'>): PlanComment {
    const commentsPath = getCommentsPath(this.projectRoot, featureName);
    const data = readJson<CommentsJson>(commentsPath) || { threads: [] };
    
    const newComment: PlanComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    data.threads.push(newComment);
    writeJson(commentsPath, data);
    
    return newComment;
  }

  clearComments(featureName: string): void {
    const commentsPath = getCommentsPath(this.projectRoot, featureName);
    writeJson(commentsPath, { threads: [] });
  }
}
