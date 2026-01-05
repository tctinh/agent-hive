import { tool } from "@opencode-ai/plugin";
import type { WorktreeService, DiffResult } from "../services/worktreeService.js";
import { StepService } from "../services/stepService.js";
import { FeatureService } from "../services/featureService.js";
import { readFile, writeFile } from "../utils/json.js";
import { getFeaturePath, getStepPath } from "../utils/paths.js";
import { assertFeatureMutable, assertStepMutable } from "../utils/immutability.js";
import * as path from "path";

export function createExecStartTool(
  worktreeService: WorktreeService,
  stepService: StepService,
  featureService: FeatureService,
  directory: string
) {
  return tool({
    description: "Create worktree and begin work on a step",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
    },
    async execute({ stepFolder }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const feature = await featureService.get(featureName);
      if (!feature) {
        return `Error: Feature "${featureName}" not found.`;
      }
      try {
        await assertFeatureMutable(feature, featureName);
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }

      const step = await stepService.read(featureName, stepFolder);
      if (!step) {
        return `Error: Step "${stepFolder}" not found.`;
      }
      if (step.status === "done") {
        return `Error: Step "${stepFolder}" is already completed. Use hive_exec_revert first if you need to redo it.`;
      }

      const worktree = await worktreeService.create(featureName, stepFolder);

      await stepService.update(featureName, stepFolder, {
        status: "in_progress",
        sessionId: undefined,
      });

      const spec = step?.spec || "(no spec)";

      return JSON.stringify(
        {
          worktreePath: worktree.path,
          branch: worktree.branch,
          spec,
          instructions: `Work in ${worktree.path}. When done, call hive_exec_complete with stepFolder="${stepFolder}".`,
        },
        null,
        2
      );
    },
  });
}

export function createExecCompleteTool(
  worktreeService: WorktreeService,
  stepService: StepService,
  featureService: FeatureService,
  directory: string
) {
  return tool({
    description: "Apply changes, mark step as done, save diff",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name"),
      summary: tool.schema.string().describe("Completion summary"),
    },
    async execute({ stepFolder, summary }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const feature = await featureService.get(featureName);
      if (!feature) {
        return `Error: Feature "${featureName}" not found.`;
      }
      try {
        await assertFeatureMutable(feature, featureName);
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }

      const step = await stepService.read(featureName, stepFolder);
      if (!step) {
        return `Error: Step "${stepFolder}" not found.`;
      }
      if (step.status !== "in_progress") {
        return `Error: Step "${stepFolder}" is not in progress (current status: ${step.status}). Use hive_exec_start first.`;
      }

      const diff = await worktreeService.getDiff(featureName, stepFolder);
      const featurePath = getFeaturePath(directory, featureName);
      const stepPath = getStepPath(featurePath, stepFolder);

      if (diff.hasDiff) {
        await writeFile(path.join(stepPath, "output.diff"), diff.diffContent);
      }

      const applyResult = await worktreeService.applyDiff(featureName, stepFolder);
      if (!applyResult.success) {
        return `Error applying changes: ${applyResult.error}`;
      }

      await stepService.update(featureName, stepFolder, {
        status: "done",
        summary,
      });

      return JSON.stringify(
        {
          success: true,
          filesAffected: applyResult.filesAffected,
          diffStats: {
            filesChanged: diff.filesChanged.length,
            insertions: diff.insertions,
            deletions: diff.deletions,
          },
        },
        null,
        2
      );
    },
  });
}

export function createExecAbortTool(
  worktreeService: WorktreeService,
  stepService: StepService,
  featureService: FeatureService,
  directory: string
) {
  return tool({
    description: "Abandon worktree and reset step to pending",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name"),
    },
    async execute({ stepFolder }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const feature = await featureService.get(featureName);
      if (!feature) {
        return `Error: Feature "${featureName}" not found.`;
      }
      try {
        await assertFeatureMutable(feature, featureName);
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }

      const step = await stepService.read(featureName, stepFolder);
      if (!step) {
        return `Error: Step "${stepFolder}" not found.`;
      }

      await worktreeService.remove(featureName, stepFolder, true);

      await stepService.update(featureName, stepFolder, {
        status: "pending",
        summary: undefined,
        sessionId: undefined,
      });

      return `Step "${stepFolder}" aborted and reset to pending.`;
    },
  });
}

export function createExecRevertTool(
  worktreeService: WorktreeService,
  stepService: StepService,
  featureService: FeatureService,
  directory: string
) {
  return tool({
    description: "Revert a completed step's changes",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name"),
    },
    async execute({ stepFolder }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const feature = await featureService.get(featureName);
      if (!feature) {
        return `Error: Feature "${featureName}" not found.`;
      }
      try {
        await assertFeatureMutable(feature, featureName);
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }

      const step = await stepService.read(featureName, stepFolder);
      if (!step) {
        return `Error: Step "${stepFolder}" not found.`;
      }
      if (step.status !== "done") {
        return `Error: Step "${stepFolder}" is not completed (current status: ${step.status}). Only completed steps can be reverted.`;
      }

      const featurePath = getFeaturePath(directory, featureName);
      const stepPath = getStepPath(featurePath, stepFolder);
      const diffPath = path.join(stepPath, "output.diff");

      const diffContent = await readFile(diffPath);
      if (!diffContent) {
        return `Error: No diff saved for step "${stepFolder}"`;
      }

      if (!diffContent.trim()) {
        await stepService.update(featureName, stepFolder, { status: "pending", summary: undefined });
        return JSON.stringify({ success: true, filesReverted: [] }, null, 2);
      }

      const conflicts = await worktreeService.checkConflictsFromSavedDiff(diffPath, true);
      if (conflicts.length > 0) {
        return JSON.stringify(
          {
            success: false,
            error: "Revert would cause conflicts",
            conflictFiles: conflicts,
          },
          null,
          2
        );
      }

      const revertResult = await worktreeService.revertFromSavedDiff(diffPath);
      if (!revertResult.success) {
        return `Error reverting: ${revertResult.error}`;
      }

      await stepService.update(featureName, stepFolder, { status: "pending", summary: undefined });

      return JSON.stringify(
        {
          success: true,
          filesReverted: revertResult.filesAffected,
        },
        null,
        2
      );
    },
  });
}
