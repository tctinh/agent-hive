import * as fs from "fs/promises";
import * as path from "path";
import type { FeatureStatus, StepWithFolder } from "../types.js";
import {
  getHivePath,
  getFeaturePath,
  getActiveFeaturePath,
  getExecutionPath,
  getContextPath,
  getRequirementsPath,
} from "../utils/paths.js";
import { ensureDir, readFile, writeJson, readJson, fileExists } from "../utils/json.js";
import { validateFeatureName } from "../utils/validation.js";
import { assertFeatureMutable } from "../utils/immutability.js";
import { StepService } from "./stepService.js";
import { DecisionService, type Decision } from "./decisionService.js";

export class FeatureService {
  constructor(
    private directory: string,
    private stepService?: StepService,
    private decisionService?: DecisionService
  ) {}

  async create(name: string, ticket: string): Promise<{ path: string }> {
    const validation = validateFeatureName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const featurePath = getFeaturePath(this.directory, name);

    const existing = await this.get(name);
    if (existing) {
      throw new Error(`Feature "${name}" already exists`);
    }

    await ensureDir(getExecutionPath(featurePath));
    await ensureDir(getContextPath(featurePath));
    await ensureDir(getRequirementsPath(featurePath));

    await fs.writeFile(
      path.join(getRequirementsPath(featurePath), "ticket.md"),
      ticket
    );

    const feature: FeatureStatus = {
      name,
      createdAt: new Date().toISOString(),
      status: "active",
    };
    await writeJson(path.join(featurePath, "feature.json"), feature);

    await this.setActive(name);

    return { path: getHivePath(this.directory) };
  }

  async get(name: string): Promise<FeatureStatus | null> {
    const featurePath = getFeaturePath(this.directory, name);
    return readJson<FeatureStatus>(path.join(featurePath, "feature.json"));
  }

  async list(): Promise<FeatureStatus[]> {
    const featuresPath = path.join(getHivePath(this.directory), "features");
    try {
      const entries = await fs.readdir(featuresPath, { withFileTypes: true });
      const features: FeatureStatus[] = [];

      for (const entry of entries.filter((e) => e.isDirectory())) {
        const feature = await this.get(entry.name);
        if (feature) {
          features.push(feature);
        }
      }

      return features;
    } catch {
      return [];
    }
  }

  async switch(name: string): Promise<{ feature: FeatureStatus }> {
    const feature = await this.get(name);
    if (!feature) {
      throw new Error(`Feature "${name}" not found`);
    }

    await this.setActive(name);
    return { feature };
  }

  private async generateCompletionReport(name: string): Promise<string> {
    const featurePath = getFeaturePath(this.directory, name);
    const reportPath = path.join(featurePath, "report.md");

    const feature = await this.get(name);
    if (!feature) {
      throw new Error(`Feature "${name}" not found`);
    }

    let steps: StepWithFolder[] = [];
    if (this.stepService) {
      steps = await this.stepService.list(name);
    }

    let decisions: Decision[] = [];
    if (this.decisionService) {
      decisions = await this.decisionService.list(name);
    }

    let problem = "(no ticket)";
    try {
      problem =
        (await readFile(path.join(featurePath, "requirements", "ticket.md"))) ||
        "(no ticket)";
    } catch {}

    const reportLines: string[] = [
      `# Feature: ${name}`,
      "",
      `**Status:** ${feature.status}`,
      `**Created:** ${feature.createdAt}`,
      `**Completed:** ${new Date().toISOString()}`,
      "",
      "## Problem",
      "",
      problem,
      "",
      "## Summary",
      "",
      `Total steps: ${steps.length}`,
      `Completed steps: ${steps.filter((s) => s.status === "done").length}`,
      `Decisions made: ${decisions.length}`,
      "",
      "## Context (Decisions)",
      "",
      decisions.length > 0
        ? decisions.map((d) => {
            const contentLines = d.content.split('\n');
            let bodyStartIndex = 0;
            for (let i = 0; i < contentLines.length; i++) {
              if (i > 3 && contentLines[i].trim()) {
                bodyStartIndex = i;
                break;
              }
            }
            const bodyContent = contentLines.slice(bodyStartIndex).join('\n').trim() || d.content;
            return `### ${d.title}\n\n${bodyContent}`;
          }).join("\n\n---\n\n")
        : "(none)",
      "",
      "## Execution (Steps)",
      "",
      steps.length > 0
        ? steps
            .map((step) => {
              const icon =
                step.status === "done"
                  ? "✅"
                  : step.status === "in_progress"
                  ? "🔄"
                  : step.status === "cancelled"
                  ? "⏭️"
                  : step.status === "failed"
                  ? "❌"
                  : step.status === "blocked"
                  ? "🚫"
                  : step.status === "reverted"
                  ? "↩️"
                  : "⬜";
              const displayStatus = step.status === "cancelled" ? "skipped" : step.status;
              let line = `${icon} **${step.order}. ${step.name}** (${displayStatus})`;
              if (step.summary) line += `\n   ${step.summary}`;
              return line;
            })
            .join("\n\n")
        : "(none)",
    ];

    await fs.writeFile(reportPath, reportLines.join("\n"));

    return reportPath;
  }

  async complete(name: string, force: boolean = false): Promise<{ path: string; reportPath: string }> {
    const feature = await this.get(name);
    if (!feature) {
      throw new Error(`Feature "${name}" not found`);
    }

    await assertFeatureMutable(feature, name);

    if (this.stepService) {
      const steps = await this.stepService.list(name);
      const activeSteps = steps.filter((s) => s.status !== "cancelled");
      const incompleteSteps = activeSteps.filter((s) => s.status !== "done");

      if (incompleteSteps.length > 0 && !force) {
        throw new Error(
          `Feature "${name}" has ${incompleteSteps.length} incomplete step(s). ` +
          `Complete all steps first or use force=true to override. ` +
          `Incomplete steps: ${incompleteSteps.map((s) => s.folder).join(", ")}`
        );
      }
    }

    feature.status = "completed";
    const featurePath = getFeaturePath(this.directory, name);
    await writeJson(path.join(featurePath, "feature.json"), feature);

    const reportPath = await this.generateCompletionReport(name);

    return { path: featurePath, reportPath };
  }

  async getActive(): Promise<string | null> {
    const masterPath = getActiveFeaturePath(this.directory);
    try {
      return (await fs.readFile(masterPath, "utf-8")).trim();
    } catch {
      return null;
    }
  }

  async setActive(name: string): Promise<void> {
    const masterPath = getActiveFeaturePath(this.directory);
    await ensureDir(path.dirname(masterPath));
    await fs.writeFile(masterPath, name);
  }

  async getActiveFeature(): Promise<{ name: string; feature: FeatureStatus } | null> {
    const name = await this.getActive();
    if (!name) {
      return null;
    }
    const feature = await this.get(name);
    if (!feature) {
      return null;
    }
    return { name, feature };
  }

  async assertActive(): Promise<string> {
    const active = await this.getActive();
    if (!active) {
      throw new Error("No active feature. Use hive_feature_create or hive_feature_switch first.");
    }
    return active;
  }
}
