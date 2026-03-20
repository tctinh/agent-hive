import {
  getPlanPath,
  getFeatureJsonPath,
  getApprovedPath,
  readJson,
  writeJson,
  readText,
  writeText,
  fileExists,
} from '../utils/paths.js';
import type { FeatureJson, PlanComment, PlanReadResult } from '../types.js';
import * as fs from 'fs';
import { ReviewService } from './reviewService.js';

export class PlanService {
  private reviewService: ReviewService;

  constructor(private projectRoot: string) {}

  private getReviewService(): ReviewService {
    if (!this.reviewService) {
      this.reviewService = new ReviewService(this.projectRoot);
    }

    return this.reviewService;
  }

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

    if (this.getReviewService().hasUnresolvedThreads(featureName)) {
      throw new Error(`Cannot approve feature '${featureName}' with unresolved review comments`);
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
    return this.getReviewService().getThreads(featureName, 'plan');
  }

  addComment(featureName: string, comment: Omit<PlanComment, 'id'>): PlanComment {
    const newComment: PlanComment = {
      ...comment,
      id: `comment-${Date.now()}`,
    };

    this.getReviewService().saveThreads(featureName, 'plan', [
      ...this.getComments(featureName),
      newComment,
    ]);
    
    return newComment;
  }

  clearComments(featureName: string): void {
    this.getReviewService().clear(featureName, 'plan');
  }
}
