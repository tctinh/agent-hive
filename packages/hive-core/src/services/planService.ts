import {
  getPlanPath,
  getCommentsPath,
  getFeatureJsonPath,
  getApprovedPath,
  readJson,
  writeJson,
  readText,
  writeText,
  fileExists,
} from '../utils/paths.js';
import { FeatureJson, CommentsJson, PlanComment, PlanReadResult } from '../types.js';
import * as fs from 'fs';

export class PlanService {
  constructor(private projectRoot: string) {}

  write(featureName: string, content: string): string {
    const planPath = getPlanPath(this.projectRoot, featureName);
    writeText(planPath, content);
    
    this.clearComments(featureName);
    this.revokeApproval(featureName);
    
    return planPath;
  }

  read(featureName: string): PlanReadResult | null {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const content = readText(planPath);
    
    if (content === null) return null;

    const comments = this.getComments(featureName);
    const isApproved = this.isApproved(featureName);

    return {
      content,
      status: isApproved ? 'approved' : 'planning',
      comments,
    };
  }

  approve(featureName: string): void {
    if (!fileExists(getPlanPath(this.projectRoot, featureName))) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }

    const approvedPath = getApprovedPath(this.projectRoot, featureName);
    const timestamp = new Date().toISOString();
    fs.writeFileSync(approvedPath, `Approved at ${timestamp}\n`);
    
    // Also update feature.json for backwards compatibility
    const featurePath = getFeatureJsonPath(this.projectRoot, featureName);
    const feature = readJson<FeatureJson>(featurePath);
    if (feature) {
      feature.status = 'approved';
      feature.approvedAt = timestamp;
      writeJson(featurePath, feature);
    }
  }

  isApproved(featureName: string): boolean {
    return fileExists(getApprovedPath(this.projectRoot, featureName));
  }

  revokeApproval(featureName: string): void {
    const approvedPath = getApprovedPath(this.projectRoot, featureName);
    if (fileExists(approvedPath)) {
      fs.unlinkSync(approvedPath);
    }
    
    // Also update feature.json for backwards compatibility
    const featurePath = getFeatureJsonPath(this.projectRoot, featureName);
    const feature = readJson<FeatureJson>(featurePath);
    if (feature && feature.status === 'approved') {
      feature.status = 'planning';
      delete feature.approvedAt;
      writeJson(featurePath, feature);
    }
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
