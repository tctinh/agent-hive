import * as path from "path";
import type { StatusResponse, FeatureListItem } from "../types.js";
import { FeatureService } from "./featureService.js";
import { StepService } from "./stepService.js";
import { DecisionService } from "./decisionService.js";
import { readFile } from "../utils/json.js";

export class StatusService {
  constructor(
    private featureService: FeatureService,
    private stepService: StepService,
    private decisionService: DecisionService
  ) {}

  async getStatus(): Promise<StatusResponse | null> {
    const active = await this.featureService.getActive();
    if (!active) {
      return null;
    }

    const feature = await this.featureService.get(active);
    if (!feature) {
      return null;
    }

    const steps = await this.stepService.list(active);
    const batches = await this.stepService.getBatches(active);
    const nextPending = await this.stepService.getNextPending(active);
    const inProgress = steps.filter((s) => s.status === "in_progress");

    const activeSteps = steps.filter((s) => s.status !== "cancelled");

    return {
      feature: active,
      featureStatus: feature.status,
      totalSteps: activeSteps.length,
      completed: activeSteps.filter((s) => s.status === "done").length,
      batches,
      nextPending: nextPending?.folder,
      inProgress: inProgress.map((s) => s.folder),
    };
  }

  async getFeatures(): Promise<{ activeFeature: string | null; features: FeatureListItem[] }> {
    const activeFeature = await this.featureService.getActive();
    const allFeatures = await this.featureService.list();

    const features: FeatureListItem[] = [];

    for (const feature of allFeatures) {
      const steps = await this.stepService.list(feature.name);
      features.push({
        name: feature.name,
        status: feature.status,
        isActive: feature.name === activeFeature,
        stepsCount: steps.length,
        doneCount: steps.filter((s) => s.status === "done").length,
      });
    }

    return {
      activeFeature,
      features,
    };
  }

  async generateReport(featureName: string): Promise<{
    problem: string;
    context: string;
    execution: string;
  }> {
    const featurePath = this.featureService["directory"];
    const decisionSummaries = await this.decisionService.getSummaries(featureName);
    const steps = await this.stepService.list(featureName);

    let problem = "(no ticket)";
    try {
      problem =
        (await readFile(path.join(featurePath, ".hive", "features", featureName, "requirements", "ticket.md"))) ||
        (await readFile(path.join(featurePath, ".hive", "features", featureName, "problem", "ticket.md"))) ||
        "(no ticket)";
    } catch {}

    const context = decisionSummaries || "(no decisions)";

    const execution = steps
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
        if (step.sessionId) line += ` [session: ${step.sessionId}]`;
        if (step.summary) line += `\n   ${step.summary}`;
        return line;
      })
      .join("\n") || "(no steps)";

    return { problem, context, execution };
  }
}
