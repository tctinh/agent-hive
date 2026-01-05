import * as fs from "fs/promises";
import * as path from "path";
import type { FeatureStatus, PlanMetadata, StepWithFolder } from "../types.js";
import { getFeaturePath } from "../utils/paths.js";
import { ensureDir, readFile, writeJson, readJson, fileExists } from "../utils/json.js";
import { assertFeatureMutable } from "../utils/immutability.js";

const MAX_HISTORY_VERSIONS = 3;

export interface PlanData {
  content: string;
  version: number;
  status: PlanMetadata["status"];
  lastUpdatedAt: string;
}

export class PlanService {
  constructor(
    private directory: string,
    private featureService?: { get(name: string): Promise<FeatureStatus | null> }
  ) {}

  private async getFeature(featureName: string): Promise<FeatureStatus | null> {
    if (this.featureService) {
      return this.featureService.get(featureName);
    }
    const featurePath = getFeaturePath(this.directory, featureName);
    return readJson<FeatureStatus>(path.join(featurePath, "feature.json"));
  }

  private async updateFeature(featureName: string, feature: FeatureStatus): Promise<void> {
    const featurePath = getFeaturePath(this.directory, featureName);
    await writeJson(path.join(featurePath, "feature.json"), feature);
  }

  getPlanPath(featureName: string): string {
    return path.join(getFeaturePath(this.directory, featureName), "plan.md");
  }

  getPlanHistoryPath(featureName: string): string {
    return path.join(getFeaturePath(this.directory, featureName), "plan-history");
  }

  async getPlan(featureName: string): Promise<PlanData | null> {
    const planPath = this.getPlanPath(featureName);
    
    if (!await fileExists(planPath)) {
      return null;
    }

    const content = await readFile(planPath);
    if (!content) {
      return null;
    }

    const feature = await this.getFeature(featureName);
    
    return {
      content,
      version: feature?.plan?.version ?? 1,
      status: feature?.plan?.status ?? "draft",
      lastUpdatedAt: feature?.plan?.lastUpdatedAt ?? new Date().toISOString(),
    };
  }

  async archiveCurrentPlan(featureName: string): Promise<void> {
    const planPath = this.getPlanPath(featureName);
    const historyPath = this.getPlanHistoryPath(featureName);

    if (!await fileExists(planPath)) {
      return;
    }

    const feature = await this.getFeature(featureName);
    const currentVersion = feature?.plan?.version ?? 0;
    
    if (currentVersion === 0) {
      return;
    }

    await ensureDir(historyPath);

    const archivePath = path.join(historyPath, `v${currentVersion}.md`);
    await fs.copyFile(planPath, archivePath);

    try {
      const entries = await fs.readdir(historyPath);
      const versions = entries
        .filter(e => e.startsWith("v") && e.endsWith(".md"))
        .map(e => parseInt(e.slice(1, -3), 10))
        .filter(v => !isNaN(v))
        .sort((a, b) => b - a);

      for (const v of versions.slice(MAX_HISTORY_VERSIONS)) {
        await fs.unlink(path.join(historyPath, `v${v}.md`));
      }
    } catch {}
  }

  async savePlan(
    featureName: string,
    content: string,
    options?: { incrementVersion?: boolean }
  ): Promise<{ path: string; version: number }> {
    const feature = await this.getFeature(featureName);
    if (!feature) {
      throw new Error(`Feature "${featureName}" not found`);
    }

    await assertFeatureMutable(feature, featureName);

    if (feature.plan?.status === "locked") {
      throw new Error(`Plan is locked. Cannot modify during execution.`);
    }

    const planPath = this.getPlanPath(featureName);
    const now = new Date().toISOString();

    if (options?.incrementVersion && feature.plan?.version) {
      await this.archiveCurrentPlan(featureName);
    }

    const newVersion = options?.incrementVersion 
      ? (feature.plan?.version ?? 0) + 1 
      : (feature.plan?.version ?? 1);

    feature.plan = {
      version: newVersion,
      status: "draft",
      generatedAt: feature.plan?.generatedAt ?? now,
      lastUpdatedAt: now,
      approvedAt: null,
      approvedBy: null,
    };

    await this.updateFeature(featureName, feature);
    await fs.writeFile(planPath, content);

    return { path: planPath, version: newVersion };
  }

  async approve(featureName: string): Promise<{ approved: true; version: number }> {
    const feature = await this.getFeature(featureName);
    if (!feature) {
      throw new Error(`Feature "${featureName}" not found`);
    }

    await assertFeatureMutable(feature, featureName);

    if (!feature.plan) {
      throw new Error(`No plan exists for feature "${featureName}". Generate a plan first.`);
    }

    if (feature.plan.status === "locked") {
      throw new Error(`Plan is already locked (execution in progress).`);
    }

    feature.plan.status = "approved";
    feature.plan.approvedAt = new Date().toISOString();
    feature.plan.approvedBy = "user";

    await this.updateFeature(featureName, feature);

    return { approved: true, version: feature.plan.version };
  }

  async lock(featureName: string): Promise<void> {
    const feature = await this.getFeature(featureName);
    if (!feature) {
      throw new Error(`Feature "${featureName}" not found`);
    }

    if (!feature.plan) {
      throw new Error(`No plan exists for feature "${featureName}".`);
    }

    if (feature.plan.status !== "approved") {
      throw new Error(`Plan must be approved before locking. Current status: ${feature.plan.status}`);
    }

    feature.plan.status = "locked";
    await this.updateFeature(featureName, feature);
  }

  async unlock(featureName: string): Promise<void> {
    const feature = await this.getFeature(featureName);
    if (!feature) {
      throw new Error(`Feature "${featureName}" not found`);
    }

    if (!feature.plan) {
      return;
    }

    feature.plan.status = "draft";
    feature.plan.approvedAt = null;
    feature.plan.approvedBy = null;
    await this.updateFeature(featureName, feature);
  }

  async getPlanHistory(featureName: string): Promise<{ version: number; path: string }[]> {
    const historyPath = this.getPlanHistoryPath(featureName);
    const history: { version: number; path: string }[] = [];

    try {
      const entries = await fs.readdir(historyPath);
      for (const entry of entries) {
        if (entry.startsWith("v") && entry.endsWith(".md")) {
          const version = parseInt(entry.slice(1, -3), 10);
          if (!isNaN(version)) {
            history.push({
              version,
              path: path.join(historyPath, entry),
            });
          }
        }
      }
    } catch {}

    return history.sort((a, b) => b.version - a.version);
  }
}
