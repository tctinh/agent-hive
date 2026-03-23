import * as fs from 'fs';
import {
  getFeaturePath,
  getFeaturesPath,
  getFeatureJsonPath,
  getContextPath,
  getTasksPath,
  getPlanPath,
  getOverviewPath,
  ensureDir,
  readJson,
  writeJson,
  fileExists,
} from '../utils/paths.js';
import type { FeatureJson, FeatureStatusType, TaskInfo, FeatureInfo, TaskStatus } from '../types.js';
import { ReviewService } from './reviewService.js';

export class FeatureService {
  private reviewService: ReviewService;

  constructor(private projectRoot: string) {}

  private getReviewService(): ReviewService {
    if (!this.reviewService) {
      this.reviewService = new ReviewService(this.projectRoot);
    }

    return this.reviewService;
  }

  create(name: string, ticket?: string): FeatureJson {
    const featurePath = getFeaturePath(this.projectRoot, name);
    
    if (fileExists(featurePath)) {
      throw new Error(`Feature '${name}' already exists`);
    }

    ensureDir(featurePath);
    ensureDir(getContextPath(this.projectRoot, name));
    ensureDir(getTasksPath(this.projectRoot, name));

    const feature: FeatureJson = {
      name,
      status: 'planning',
      ticket,
      createdAt: new Date().toISOString(),
    };

    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);

    return feature;
  }

  get(name: string): FeatureJson | null {
    return readJson<FeatureJson>(getFeatureJsonPath(this.projectRoot, name));
  }

  list(): string[] {
    const featuresPath = getFeaturesPath(this.projectRoot);
    if (!fileExists(featuresPath)) return [];
    
    return fs.readdirSync(featuresPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  }

  getActive(): FeatureJson | null {
    const features = this.list();
    for (const name of features) {
      const feature = this.get(name);
      if (feature && feature.status !== 'completed') {
        return feature;
      }
    }
    return null;
  }

  updateStatus(name: string, status: FeatureStatusType): FeatureJson {
    const feature = this.get(name);
    if (!feature) throw new Error(`Feature '${name}' not found`);

    feature.status = status;
    
    if (status === 'approved' && !feature.approvedAt) {
      feature.approvedAt = new Date().toISOString();
    }
    if (status === 'completed' && !feature.completedAt) {
      feature.completedAt = new Date().toISOString();
    }

    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
    return feature;
  }

  getInfo(name: string): FeatureInfo | null {
    const feature = this.get(name);
    if (!feature) return null;

    const tasks = this.getTasks(name);
    const hasPlan = fileExists(getPlanPath(this.projectRoot, name));
    const hasOverview = fileExists(getOverviewPath(this.projectRoot, name));
    const reviewCounts = this.getReviewService().countByDocument(name);
    const commentCount = reviewCounts.plan + reviewCounts.overview;

    return {
      name: feature.name,
      status: feature.status,
      tasks,
      hasPlan,
      hasOverview,
      commentCount,
      reviewCounts,
    };
  }

  private getTasks(featureName: string): TaskInfo[] {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    if (!fileExists(tasksPath)) return [];

    const folders = fs.readdirSync(tasksPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();

    return folders.map(folder => {
      const statusPath = `${tasksPath}/${folder}/status.json`;
      const status = readJson<TaskStatus>(statusPath);
      const name = folder.replace(/^\d+-/, '');
      
      return {
        folder,
        name,
        status: status?.status || 'pending',
        origin: status?.origin || 'plan',
        planTitle: status?.planTitle,
        summary: status?.summary,
      };
    });
  }

  complete(name: string): FeatureJson {
    const feature = this.get(name);
    if (!feature) throw new Error(`Feature '${name}' not found`);
    
    if (feature.status === 'completed') {
      throw new Error(`Feature '${name}' is already completed`);
    }

    return this.updateStatus(name, 'completed');
  }

  setSession(name: string, sessionId: string): void {
    const feature = this.get(name);
    if (!feature) throw new Error(`Feature '${name}' not found`);

    feature.sessionId = sessionId;
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
  }

  getSession(name: string): string | undefined {
    const feature = this.get(name);
    return feature?.sessionId;
  }
}
