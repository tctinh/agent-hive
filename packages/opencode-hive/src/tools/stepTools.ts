import { tool } from "@opencode-ai/plugin";
import { StepService } from "../services/stepService.js";
import { readFile, writeFile } from "../utils/json.js";
import { FeatureService } from "../services/featureService.js";
import { DecisionService } from "../services/decisionService.js";
import * as path from "path";

export function createStepCreateTool(
  stepService: StepService,
  featureService: FeatureService,
  decisionService: DecisionService
) {
  return tool({
    description: "Create an execution step for the active feature. Creates folder with spec.md and status.json, initializes OpenCode session.",
    args: {
      name: tool.schema.string().describe("Step name (kebab-case)"),
      order: tool.schema.number().describe("Step order (1, 2, 3...). Same order = parallel execution."),
      spec: tool.schema.string().describe("Step specification / requirements (markdown)"),
    },
    async execute({ name, order, spec }) {
      const featureName = await featureService.getActive();

      if (!featureName) {
        return "Error: No active feature. Use hive_feature_create first.";
      }

      const { folder } = await stepService.create(featureName, name, order, spec);

      const enrichedSpec = await enrichSpec(featureService, decisionService, featureName, spec);

      await writeFile(
        path.join(featureService["directory"], ".hive", "features", featureName, "execution", folder, "spec.md"),
        enrichedSpec
      );

      return `Step "${name}" created at execution/${folder}/ with context injected.`;
    },
  });
}

export function createStepReadTool(stepService: StepService, featureService: FeatureService) {
  return tool({
    description: "Read a step's spec and status without modifying it",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
    },
    async execute({ stepFolder }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const step = await stepService.read(featureName, stepFolder);
      if (!step) {
        return `Error: Step "${stepFolder}" not found.`;
      }

      return JSON.stringify(
        {
          folder: step.folder,
          name: step.name,
          order: step.order,
          status: step.status,
          summary: step.summary,
          spec: step.spec,
        },
        null,
        2
      );
    },
  });
}

export function createStepUpdateTool(stepService: StepService, featureService: FeatureService) {
  return tool({
    description: "Update step spec, order, status, or summary. Replaces edit/reorder/reset tools.",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
      status: tool.schema.string().optional().describe("New status: pending, in_progress, done, blocked, cancelled"),
      order: tool.schema.number().optional().describe("New order number (for reordering - renames folder)"),
      summary: tool.schema.string().optional().describe("Completion summary"),
      clearSummary: tool.schema.boolean().optional().describe("Remove the summary field (for reset behavior)"),
      sessionId: tool.schema.string().optional().describe("OpenCode session ID to track"),
      spec: tool.schema.string().optional().describe("Updated spec content (replaces entire spec.md)"),
    },
    async execute({ stepFolder, status, order, summary, clearSummary, sessionId, spec }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const result = await stepService.update(featureName, stepFolder, {
        status: status as any,
        order,
        summary,
        clearSummary,
        sessionId,
        spec,
      });

      let message = `Step "${stepFolder}" updated.`;
      if (result.newFolder && result.newFolder !== stepFolder) {
        message += ` Renamed to "${result.newFolder}".`;
      }
      return message;
    },
  });
}

export function createStepDeleteTool(stepService: StepService, featureService: FeatureService) {
  return tool({
    description: "Delete a step from the plan (removes folder entirely)",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
      confirm: tool.schema.boolean().describe("Must be true to confirm deletion"),
    },
    async execute({ stepFolder, confirm }) {
      if (!confirm) {
        return "Error: Set confirm=true to delete step.";
      }

      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      await stepService.delete(featureName, stepFolder);

      return `Step "${stepFolder}" deleted.`;
    },
  });
}

export function createStepListTool(stepService: StepService, featureService: FeatureService) {
  return tool({
    description: "List all steps for the active feature",
    args: {},
    async execute() {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const steps = await stepService.list(featureName);

      return JSON.stringify(
        {
          feature: featureName,
          steps: steps.map((s) => ({
            folder: s.folder,
            name: s.name,
            order: s.order,
            status: s.status,
            summary: s.summary,
          })),
        },
        null,
        2
      );
    },
  });
}

async function enrichSpec(
  featureService: FeatureService,
  decisionService: DecisionService,
  featureName: string,
  spec: string
): Promise<string> {
  let ticket = "(none)";
  try {
    ticket =
      (await readFile(path.join(featureService["directory"], ".hive", "features", featureName, "requirements", "ticket.md"))) ||
      (await readFile(path.join(featureService["directory"], ".hive", "features", featureName, "problem", "ticket.md"))) ||
      "(none)";
  } catch {}

  const decisions = await decisionService.getSummaries(featureName);

  return `## Context

### Requirements
${ticket}

### Design Decisions
${decisions}

---

## Task

${spec}
`;
}
