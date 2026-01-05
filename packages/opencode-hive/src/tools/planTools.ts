import { tool } from "@opencode-ai/plugin";
import type { StepWithFolder, BatchInfo } from "../types.js";
import { FeatureService } from "../services/featureService.js";
import { StepService } from "../services/stepService.js";
import { DecisionService, type Decision } from "../services/decisionService.js";
import { PlanService } from "../services/planService.js";
import { getFeaturePath } from "../utils/paths.js";
import { readFile } from "../utils/json.js";
import * as path from "path";

function getStatusIcon(status: string): string {
  return status === "draft" ? "🔄" : status === "approved" ? "✅" : "🔒";
}

function extractFilesFromSpec(spec: string): string[] {
  const files: string[] = [];
  const patterns = [
    /`([^`]+\.[a-z]{2,4})`/gi,
    /(?:^|\s)([\w./]+\.[a-z]{2,4})(?:\s|$|,)/gim,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(spec)) !== null) {
      const file = match[1];
      if (file && !files.includes(file) && !file.startsWith("http")) {
        files.push(file);
      }
    }
  }
  
  return files.slice(0, 5);
}

function extractDescriptionFromSpec(spec: string): string {
  const lines = spec.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("-") && !trimmed.startsWith("```")) {
      return trimmed.slice(0, 100) + (trimmed.length > 100 ? "..." : "");
    }
  }
  
  return "(no description)";
}

function generatePlanMarkdown(
  featureName: string,
  goal: string,
  batches: BatchInfo[],
  steps: StepWithFolder[],
  decisions: Decision[],
  version: number
): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`# Implementation Plan: ${featureName}`);
  lines.push("");
  lines.push(`**Status**: 🔄 Draft`);
  lines.push(`**Version**: ${version}`);
  lines.push(`**Last Updated**: ${now}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Goal");
  lines.push("");
  lines.push(goal || `Implement ${featureName}`);
  lines.push("");

  const allFiles = new Set<string>();
  for (const step of steps) {
    if (step.spec) {
      for (const file of extractFilesFromSpec(step.spec)) {
        allFiles.add(file);
      }
    }
  }

  if (allFiles.size > 0) {
    lines.push("## Files to Touch");
    lines.push("");
    for (const file of Array.from(allFiles).slice(0, 15)) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Execution Strategy");
  lines.push("");

  for (const batch of batches) {
    const batchSteps = steps.filter(s => s.order === batch.order);
    const batchName = batch.parallel ? "Parallel" : "Sequential";
    
    lines.push(`### Batch ${batch.order}: ${batchName}`);
    lines.push("");
    lines.push("| Step | Description | Files |");
    lines.push("|------|-------------|-------|");
    
    for (const step of batchSteps) {
      const desc = step.spec ? extractDescriptionFromSpec(step.spec) : "(no spec)";
      const files = step.spec ? extractFilesFromSpec(step.spec).slice(0, 3).map(f => `\`${f}\``).join(", ") : "";
      lines.push(`| ${step.folder} | ${desc} | ${files} |`);
    }
    
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Decisions");
  lines.push("");

  if (decisions.length > 0) {
    for (const decision of decisions) {
      const summary = decision.content.split("\n").find(l => l.trim() && !l.startsWith("#")) || "";
      lines.push(`- **${decision.title}**: ${summary.slice(0, 100)}`);
    }
  } else {
    lines.push("(none)");
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("## Review Comments");
  lines.push("");
  lines.push("<!-- Comments will appear here after review -->");
  lines.push("");

  return lines.join("\n");
}

export function createPlanGenerateTool(
  planService: PlanService,
  featureService: FeatureService,
  stepService: StepService,
  decisionService: DecisionService
) {
  return tool({
    description: "Generate plan.md from steps and decisions for the active feature",
    args: {
      featureName: tool.schema.string().optional().describe("Feature name (defaults to active)"),
    },
    async execute({ featureName }) {
      const name = featureName || await featureService.assertActive();
      
      const feature = await featureService.get(name);
      if (!feature) {
        throw new Error(`Feature "${name}" not found`);
      }

      const steps = await stepService.list(name);
      const batches = await stepService.getBatches(name);
      const decisions = await decisionService.list(name);

      let goal = `Implement ${name}`;
      try {
        const featurePath = getFeaturePath(planService["directory"], name);
        const ticketContent = await readFile(path.join(featurePath, "requirements", "ticket.md"));
        if (ticketContent) {
          goal = ticketContent.split("\n").find(l => l.trim()) || goal;
        }
      } catch {}

      const existingPlan = await planService.getPlan(name);
      const version = existingPlan ? existingPlan.version + 1 : 1;

      const content = generatePlanMarkdown(name, goal, batches, steps, decisions, version);

      const result = await planService.savePlan(name, content, { 
        incrementVersion: !!existingPlan 
      });

      return JSON.stringify({
        path: result.path,
        version: result.version,
        status: "draft",
      });
    },
  });
}
