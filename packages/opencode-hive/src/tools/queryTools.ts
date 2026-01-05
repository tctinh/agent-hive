import { tool } from "@opencode-ai/plugin";
import { FeatureService } from "../services/featureService.js";
import { StepService } from "../services/stepService.js";
import { DecisionService } from "../services/decisionService.js";
import { StatusService } from "../services/statusService.js";
import * as path from "path";
import { readFile } from "../utils/json.js";

export function createStatusTool(featureService: FeatureService, stepService: StepService, decisionService: DecisionService) {
  const statusService = new StatusService(featureService, stepService, decisionService);

  return tool({
    description: "Get current hive status - active feature, all steps, their status, and parallelism info",
    args: {},
    async execute() {
      const active = await featureService.getActive();
      if (!active) {
        return "No active feature. Use hive_feature_create first.";
      }

      const feature = await featureService.get(active);
      if (!feature) {
        return "Error: Active feature not found.";
      }

      const status = await statusService.getStatus();

      if (!status) {
        return "Error: Could not retrieve status.";
      }

      const featurePath = featureService["directory"];
      const ticketPath = path.join(featurePath, ".hive", "features", active, "requirements", "ticket.md");
      let hasTicket = false;
      try {
        const ticket = await readFile(ticketPath);
        hasTicket = !!(ticket && ticket.trim().length > 0);
      } catch {}

      const decisions = await decisionService.list(active);
      const stepCounts = status.batches.reduce(
        (acc, batch) => {
          acc.total += batch.steps.length;
          acc.completed += batch.steps.filter((s) => s.status === "done").length;
          acc.inProgress += batch.steps.filter((s) => s.status === "in_progress").length;
          acc.pending += batch.steps.filter((s) => s.status === "pending").length;
          return acc;
        },
        { total: 0, completed: 0, inProgress: 0, pending: 0 }
      );

      const progressPercentage = stepCounts.total > 0
        ? Math.round((stepCounts.completed / stepCounts.total) * 100)
        : 0;

      const enhancedStatus = {
        ...status,
        hasTicket,
        decisionCount: decisions.length,
        stepCounts,
        progress: {
          percentage: progressPercentage,
          completed: stepCounts.completed,
          total: stepCounts.total,
        },
      };

      return JSON.stringify(enhancedStatus, null, 2);
    },
  });
}
