import * as fs from "fs/promises";
import * as path from "path";
import {
  getFeaturePath,
  getContextPath,
  getDecisionFilename,
} from "../utils/paths.js";
import { ensureDir, readFile, fileExists, readJson } from "../utils/json.js";
import { validateDecisionTitle } from "../utils/validation.js";
import { assertFeatureMutable } from "../utils/immutability.js";
import type { FeatureStatus } from "../types.js";

export interface Decision {
  filename: string;
  title: string;
  content: string;
  loggedAt: string;
}

export class DecisionService {
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

  async log(featureName: string, title: string, content: string): Promise<{ filename: string }> {
    if (this.featureService) {
      const feature = await this.getFeature(featureName);
      if (feature) {
        await assertFeatureMutable(feature, featureName);
      }
    }
    const validation = validateDecisionTitle(title);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const featurePath = getFeaturePath(this.directory, featureName);
    const contextPath = getContextPath(featurePath);
    const filename = getDecisionFilename(title);
    const decisionPath = path.join(contextPath, filename);

    const fullContent = `# ${title}\n\n_Logged: ${new Date().toISOString()}_\n\n${content}`;
    await ensureDir(contextPath);
    await fs.writeFile(decisionPath, fullContent);

    return { filename };
  }

  async list(featureName: string): Promise<Decision[]> {
    const contextPath = getContextPath(getFeaturePath(this.directory, featureName));
    const decisions: Decision[] = [];

    try {
      const files = await fs.readdir(contextPath);
      for (const file of files.filter((f) => f.endsWith(".md")).sort()) {
        const content = await fs.readFile(path.join(contextPath, file), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] || file.replace(".md", "");
        const loggedAtMatch = content.match(/_Logged:\s+(.+)_/);
        const loggedAt = loggedAtMatch?.[1] || "";

        decisions.push({
          filename: file,
          title,
          content,
          loggedAt,
        });
      }
    } catch {}

    return decisions;
  }

  async read(featureName: string, filename: string): Promise<Decision | null> {
    const contextPath = getContextPath(getFeaturePath(this.directory, featureName));
    const decisionPath = path.join(contextPath, filename);

    const exists = await fileExists(decisionPath);
    if (!exists) {
      return null;
    }

    const content = await fs.readFile(decisionPath, "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] || filename.replace(".md", "");
    const loggedAtMatch = content.match(/_Logged:\s+(.+)_/);
    const loggedAt = loggedAtMatch?.[1] || "";

    return {
      filename,
      title,
      content,
      loggedAt,
    };
  }

  async getSummaries(featureName: string): Promise<string> {
    const decisions = await this.list(featureName);

    if (decisions.length === 0) {
      return "(none)";
    }

    const summaries = decisions.map((d) => `- **${d.title}**`);
    return summaries.join("\n");
  }
}
