import { tool, type Plugin } from "@opencode-ai/plugin";
import * as fs from "fs/promises";
import * as path from "path";
import { createWorktreeService, type WorktreeService, type DiffResult } from "./services/worktreeService";

// ============================================================================
// TYPES
// ============================================================================

interface ExecutionInfo {
  worktreeBranch: string;
  worktreePath: string;
  appliedAt?: string;
  canRevert: boolean;
}

interface SessionInfo {
  sessionId: string;
  lastActive: string;
}

interface StepStatus {
  name: string;
  order: number;
  status: "pending" | "in_progress" | "done" | "blocked" | "reverted" | "failed" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  sessionId?: string;
  sessionTitle?: string;
  execution?: ExecutionInfo | null;
  sessions?: {
    opencode?: SessionInfo;
  };
}

interface ReportJson {
  feature: string;
  status: string;
  steps: Array<{
    folder: string;
    name: string;
    order: number;
    status: string;
    summary?: string;
    execution?: ExecutionInfo | null;
  }>;
  decisions: string[];
  generatedAt: string;
}

interface Feature {
  name: string;
  createdAt: string;
  status: "active" | "completed" | "archived";
}

// ============================================================================
// UTILITIES
// ============================================================================

function getHivePath(directory: string): string {
  return path.join(directory, ".hive");
}

function getFeaturePath(directory: string, featureName: string): string {
  return path.join(getHivePath(directory), "features", featureName);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function getActiveFeature(directory: string): Promise<string | null> {
  const masterPath = path.join(getHivePath(directory), "active-feature.txt");
  try {
    return (await fs.readFile(masterPath, "utf-8")).trim();
  } catch {
    return null;
  }
}

async function setActiveFeature(directory: string, name: string): Promise<void> {
  const masterPath = path.join(getHivePath(directory), "active-feature.txt");
  await ensureDir(path.dirname(masterPath));
  await fs.writeFile(masterPath, name);
}

async function getDecisionSummaries(featurePath: string): Promise<string> {
  const contextPath = path.join(featurePath, "context");
  try {
    const files = await fs.readdir(contextPath);
    const summaries: string[] = [];
    for (const file of files.filter(f => f.endsWith(".md")).sort()) {
      const content = await fs.readFile(path.join(contextPath, file), "utf-8");
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] || file.replace(".md", "");
      summaries.push(`- **${title}**`);
    }
    return summaries.join("\n") || "(none)";
  } catch {
    return "(none)";
  }
}

async function getSteps(featurePath: string): Promise<(StepStatus & { folder: string; spec?: string })[]> {
  const executionPath = path.join(featurePath, "execution");
  const steps: (StepStatus & { folder: string; spec?: string })[] = [];
  try {
    const entries = await fs.readdir(executionPath, { withFileTypes: true });
    for (const entry of entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const status = await readJson<StepStatus>(path.join(executionPath, entry.name, "status.json"));
      if (status) {
        let spec: string | undefined;
        try { spec = await fs.readFile(path.join(executionPath, entry.name, "spec.md"), "utf-8"); } catch {}
        steps.push({ ...status, folder: entry.name, spec });
      }
    }
  } catch {}
  return steps;
}

function groupBy<T>(arr: T[], keyFn: (item: T) => number): Record<number, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<number, T[]>);
}

// ============================================================================
// TOOL FACTORIES
// ============================================================================

function createFeatureCreateTool(directory: string) {
  return tool({
    description: "Create a new feature in .hive/features/. Sets it as active.",
    args: {
      name: tool.schema.string().describe("Feature name (kebab-case)"),
      ticket: tool.schema.string().describe("Problem description / ticket content"),
    },
    async execute({ name, ticket }) {
      const featurePath = getFeaturePath(directory, name);
      
      await ensureDir(path.join(featurePath, "requirements"));
      await ensureDir(path.join(featurePath, "context"));
      await ensureDir(path.join(featurePath, "execution"));
      
      await fs.writeFile(path.join(featurePath, "requirements", "ticket.md"), ticket);
      
      const feature: Feature = {
        name,
        createdAt: new Date().toISOString(),
        status: "active",
      };
      await writeJson(path.join(featurePath, "feature.json"), feature);
      await setActiveFeature(directory, name);
      
      return `Feature "${name}" created at .hive/features/${name}/`;
    },
  });
}

function createStepCreateTool(directory: string) {
  return tool({
    description: "Create an execution step for the active feature. Creates folder with spec.md and status.json, initializes OpenCode session.",
    args: {
      name: tool.schema.string().describe("Step name (kebab-case)"),
      order: tool.schema.number().describe("Step order (1, 2, 3...). Same order = parallel execution."),
      spec: tool.schema.string().describe("Step specification / requirements (markdown)"),
    },
    async execute({ name, order, spec }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature. Use hive_feature_create first.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const stepFolder = `${String(order).padStart(2, "0")}-${name}`;
      const stepPath = path.join(featurePath, "execution", stepFolder);
      
      await ensureDir(stepPath);
      
      const ticket = await fs.readFile(
        path.join(featurePath, "requirements", "ticket.md"), "utf-8"
      ).catch(() => fs.readFile(
        path.join(featurePath, "problem", "ticket.md"), "utf-8"
      ).catch(() => "(none)"));
      
      const decisions = await getDecisionSummaries(featurePath);
      
      const enrichedSpec = `## Context

### Requirements
${ticket}

### Design Decisions
${decisions}

---

## Task

${spec}
`;
      
      await fs.writeFile(path.join(stepPath, "spec.md"), enrichedSpec);
      
      const status: StepStatus = {
        name,
        order,
        status: "pending",
      };
      
      await writeJson(path.join(stepPath, "status.json"), status);
      
      return `Step "${name}" created at execution/${stepFolder}/ with context injected.`;
    },
  });
}

function createStepUpdateTool(directory: string) {
  return tool({
    description: "Update step status, summary, or session info",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
      status: tool.schema.string().optional().describe("New status: pending, in_progress, done, blocked"),
      summary: tool.schema.string().optional().describe("Completion summary"),
      sessionId: tool.schema.string().optional().describe("OpenCode session ID to track"),
    },
    async execute({ stepFolder, status, summary, sessionId }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const statusPath = path.join(
        getFeaturePath(directory, featureName), 
        "execution", 
        stepFolder, 
        "status.json"
      );
      const stepStatus = await readJson<StepStatus>(statusPath);
      if (!stepStatus) return `Error: Step ${stepFolder} not found.`;
      
      if (status) {
        stepStatus.status = status as StepStatus["status"];
        if (status === "in_progress" && !stepStatus.startedAt) {
          stepStatus.startedAt = new Date().toISOString();
        }
        if (status === "done") {
          stepStatus.completedAt = new Date().toISOString();
        }
      }
      if (summary) stepStatus.summary = summary;
      if (sessionId) stepStatus.sessionId = sessionId;
      
      await writeJson(statusPath, stepStatus);
      return `Step "${stepStatus.name}" updated: status=${stepStatus.status}`;
    },
  });
}

function createDecisionTool(directory: string) {
  return tool({
    description: "Log an architectural decision to context/",
    args: {
      title: tool.schema.string().describe("Decision title"),
      content: tool.schema.string().describe("Decision content (markdown)"),
    },
    async execute({ title, content }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${timestamp}-${title.toLowerCase().replace(/\s+/g, "-")}.md`;
      const decisionPath = path.join(getFeaturePath(directory, featureName), "context", filename);
      
      const fullContent = `# ${title}\n\n_Logged: ${new Date().toISOString()}_\n\n${content}`;
      await fs.writeFile(decisionPath, fullContent);
      return `Decision logged: ${filename}`;
    },
  });
}

function createReportTool(directory: string) {
  return tool({
    description: "Generate a PROBLEM/CONTEXT/EXECUTION report for the active feature",
    args: {},
    async execute() {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      
      let problem = "(no ticket)";
      try { problem = await fs.readFile(path.join(featurePath, "requirements", "ticket.md"), "utf-8"); } catch {
        try { problem = await fs.readFile(path.join(featurePath, "problem", "ticket.md"), "utf-8"); } catch {}
      }
      
      let context = "";
      try {
        const files = await fs.readdir(path.join(featurePath, "context"));
        for (const file of files.filter(f => f.endsWith(".md"))) {
          const c = await fs.readFile(path.join(featurePath, "context", file), "utf-8");
          context += `\n### ${file}\n${c}\n`;
        }
      } catch {}
      
      let execution = "";
      try {
        const entries = await fs.readdir(path.join(featurePath, "execution"), { withFileTypes: true });
        const stepFolders = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
        
        for (const folder of stepFolders) {
          const statusPath = path.join(featurePath, "execution", folder, "status.json");
          const stepStatus = await readJson<StepStatus>(statusPath);
          if (stepStatus) {
            const icon = stepStatus.status === "done" ? "✅" 
              : stepStatus.status === "in_progress" ? "🔄" 
              : stepStatus.status === "cancelled" ? "⏭️"
              : stepStatus.status === "failed" ? "❌"
              : stepStatus.status === "blocked" ? "🚫"
              : stepStatus.status === "reverted" ? "↩️"
              : "⬜";
            const displayStatus = stepStatus.status === "cancelled" ? "skipped" : stepStatus.status;
            execution += `${icon} **${stepStatus.order}. ${stepStatus.name}** (${displayStatus})`;
            if (stepStatus.sessionId) execution += ` [session: ${stepStatus.sessionId}]`;
            execution += "\n";
            if (stepStatus.summary) execution += `   ${stepStatus.summary}\n`;
          }
        }
      } catch {}
      
      return `# Feature: ${featureName}\n\n## REQUIREMENTS\n${problem}\n\n## CONTEXT\n${context || "(no decisions)"}\n\n## EXECUTION\n${execution || "(no steps)"}`;
    },
  });
}

function createStatusTool(directory: string) {
  return tool({
    description: "Get current hive status - active feature, all steps, their status, and parallelism info",
    args: {},
    async execute() {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "No active feature. Use hive_feature_create first.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const feature = await readJson<Feature>(path.join(featurePath, "feature.json"));
      const steps = await getSteps(featurePath);
      
      const batches = groupBy(steps, s => s.order);
      const batchList = Object.entries(batches)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([order, batchSteps]) => ({
          order: Number(order),
          parallel: batchSteps.length > 1,
          steps: batchSteps.map(s => ({ folder: s.folder, name: s.name, status: s.status })),
        }));
      
      const nextPending = steps.find(s => s.status === "pending");
      const inProgress = steps.filter(s => s.status === "in_progress");
      
      const activeSteps = steps.filter(s => s.status !== "cancelled");
      return JSON.stringify({
        feature: featureName,
        featureStatus: feature?.status,
        totalSteps: activeSteps.length,
        completed: activeSteps.filter(s => s.status === "done").length,
        batches: batchList,
        nextPending: nextPending?.folder,
        inProgress: inProgress.map(s => s.folder),
      }, null, 2);
    },
  });
}

function createPickupTool(directory: string) {
  return tool({
    description: "Pick up a step to work on - returns full context and marks as in_progress",
    args: {
      stepFolder: tool.schema.string().optional().describe("Step folder (e.g., 01-setup). If omitted, picks next pending."),
    },
    async execute({ stepFolder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const steps = await getSteps(featurePath);
      
      let targetStep = stepFolder 
        ? steps.find(s => s.folder === stepFolder)
        : steps.find(s => s.status === "pending");
      
      if (!targetStep) return "No pending steps found.";
      
      const stepPath = path.join(featurePath, "execution", targetStep.folder);
      const statusPath = path.join(stepPath, "status.json");
      
      const status = await readJson<StepStatus>(statusPath);
      if (status) {
        status.status = "in_progress";
        status.startedAt = new Date().toISOString();
        await writeJson(statusPath, status);
      }
      
      return `## Step: ${targetStep.folder} - ${targetStep.name}

${targetStep.spec || "(no spec)"}

---
_Status updated to in_progress_`;
    },
  });
}

function createExecuteTool(directory: string) {
  return tool({
    description: "Analyze hive plan and generate execution strategy with parallelism",
    args: {
      dryRun: tool.schema.boolean().optional().describe("If true (default), only show plan. If false, mark steps in_progress."),
    },
    async execute({ dryRun = true }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const steps = await getSteps(featurePath);
      const pendingSteps = steps.filter(s => s.status === "pending" || s.status === "in_progress");
      
      if (pendingSteps.length === 0) return "All steps completed!";
      
      const batches = groupBy(pendingSteps, s => s.order);
      const batchList = Object.entries(batches)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([order, batchSteps]) => ({
          order: Number(order),
          parallel: batchSteps.length > 1,
          steps: batchSteps.map(s => ({
            folder: s.folder,
            name: s.name,
            status: s.status,
            agent: "general",
          })),
        }));
      
      const planText = batchList.map(b => {
        const mode = b.parallel ? "(parallel)" : "(sequential)";
        const stepList = b.steps.map(s => `  - ${s.folder} → ${s.agent} agent [${s.status}]`).join("\n");
        return `Batch ${b.order} ${mode}:\n${stepList}`;
      }).join("\n\n");
      
      return JSON.stringify({
        feature: featureName,
        dryRun,
        batches: batchList,
        plan: `## Execution Plan\n\n${planText}\n\nProceed? [yes/no]`,
      }, null, 2);
    },
  });
}

// ============================================================================
// REVISION TOOLS
// ============================================================================

function createStepEditTool(directory: string) {
  return tool({
    description: "Edit a step's spec.md after creation",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
      spec: tool.schema.string().describe("New spec content (markdown). Replaces the Task section."),
      fullReplace: tool.schema.boolean().optional().describe("If true, replace entire spec.md. If false (default), only update Task section."),
    },
    async execute({ stepFolder, spec, fullReplace = false }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const specPath = path.join(featurePath, "execution", stepFolder, "spec.md");
      
      try {
        await fs.access(specPath);
      } catch {
        return `Error: Step ${stepFolder} not found.`;
      }
      
      if (fullReplace) {
        const ticket = await fs.readFile(
          path.join(featurePath, "requirements", "ticket.md"), "utf-8"
        ).catch(() => fs.readFile(
          path.join(featurePath, "problem", "ticket.md"), "utf-8"
        ).catch(() => "(none)"));
        
        const decisions = await getDecisionSummaries(featurePath);
        
        const enrichedSpec = `## Context

### Requirements
${ticket}

### Design Decisions
${decisions}

---

## Task

${spec}
`;
        await fs.writeFile(specPath, enrichedSpec);
      } else {
        const currentSpec = await fs.readFile(specPath, "utf-8");
        const taskMatch = currentSpec.match(/(## Task\s*\n)/);
        if (taskMatch) {
          const beforeTask = currentSpec.substring(0, taskMatch.index! + taskMatch[0].length);
          await fs.writeFile(specPath, `${beforeTask}\n${spec}\n`);
        } else {
          await fs.writeFile(specPath, `${currentSpec}\n\n## Task\n\n${spec}\n`);
        }
      }
      
      return `Step "${stepFolder}" spec updated.`;
    },
  });
}

function createStepDeleteTool(directory: string) {
  return tool({
    description: "Delete a step from the plan (removes folder entirely)",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
      confirm: tool.schema.boolean().describe("Must be true to confirm deletion"),
    },
    async execute({ stepFolder, confirm }) {
      if (!confirm) return "Error: Set confirm=true to delete step.";
      
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const stepPath = path.join(getFeaturePath(directory, featureName), "execution", stepFolder);
      
      try {
        await fs.access(stepPath);
      } catch {
        return `Error: Step ${stepFolder} not found.`;
      }
      
      await fs.rm(stepPath, { recursive: true });
      return `Step "${stepFolder}" deleted.`;
    },
  });
}

function createStepReorderTool(directory: string) {
  return tool({
    description: "Change a step's order number (renames folder and updates status.json)",
    args: {
      stepFolder: tool.schema.string().describe("Current step folder name (e.g., 01-setup)"),
      newOrder: tool.schema.number().describe("New order number"),
    },
    async execute({ stepFolder, newOrder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const executionPath = path.join(featurePath, "execution");
      const oldStepPath = path.join(executionPath, stepFolder);
      
      const status = await readJson<StepStatus>(path.join(oldStepPath, "status.json"));
      if (!status) return `Error: Step ${stepFolder} not found.`;
      
      const newStepFolder = `${String(newOrder).padStart(2, "0")}-${status.name}`;
      const newStepPath = path.join(executionPath, newStepFolder);
      
      try {
        await fs.access(newStepPath);
        return `Error: Target folder ${newStepFolder} already exists.`;
      } catch {}
      
      status.order = newOrder;
      await writeJson(path.join(oldStepPath, "status.json"), status);
      await fs.rename(oldStepPath, newStepPath);
      
      return `Step reordered: ${stepFolder} → ${newStepFolder}`;
    },
  });
}

function createStepResetTool(directory: string) {
  return tool({
    description: "Reset a step to pending status (for redo). Clears timestamps and summary.",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
      clearSummary: tool.schema.boolean().optional().describe("Also clear the summary (default: true)"),
    },
    async execute({ stepFolder, clearSummary = true }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const statusPath = path.join(
        getFeaturePath(directory, featureName),
        "execution",
        stepFolder,
        "status.json"
      );
      
      const status = await readJson<StepStatus>(statusPath);
      if (!status) return `Error: Step ${stepFolder} not found.`;
      
      const oldStatus = status.status;
      status.status = "pending";
      delete status.startedAt;
      delete status.completedAt;
      if (clearSummary) delete status.summary;
      
      await writeJson(statusPath, status);
      return `Step "${status.name}" reset: ${oldStatus} → pending`;
    },
  });
}

function createFeatureListTool(directory: string) {
  return tool({
    description: "List all features in .hive/features/",
    args: {},
    async execute() {
      const featuresPath = path.join(getHivePath(directory), "features");
      const activeFeature = await getActiveFeature(directory);
      
      try {
        const entries = await fs.readdir(featuresPath, { withFileTypes: true });
        const features: { name: string; status: string; isActive: boolean; stepsCount: number; doneCount: number }[] = [];
        
        for (const entry of entries.filter(e => e.isDirectory())) {
          const featurePath = path.join(featuresPath, entry.name);
          const featureJson = await readJson<Feature>(path.join(featurePath, "feature.json"));
          const steps = await getSteps(featurePath);
          
          features.push({
            name: entry.name,
            status: featureJson?.status || "unknown",
            isActive: entry.name === activeFeature,
            stepsCount: steps.length,
            doneCount: steps.filter(s => s.status === "done").length,
          });
        }
        
        if (features.length === 0) {
          return "No features found. Use hive_feature_create to create one.";
        }
        
        return JSON.stringify({ activeFeature, features }, null, 2);
      } catch {
        return "No features directory found. Use hive_feature_create to start.";
      }
    },
  });
}

function createFeatureSwitchTool(directory: string) {
  return tool({
    description: "Switch the active feature to work on a different one",
    args: {
      name: tool.schema.string().describe("Feature name to switch to"),
    },
    async execute({ name }) {
      const featurePath = getFeaturePath(directory, name);
      
      try {
        await fs.access(path.join(featurePath, "feature.json"));
      } catch {
        return `Error: Feature "${name}" not found.`;
      }
      
      await setActiveFeature(directory, name);
      
      const steps = await getSteps(featurePath);
      const done = steps.filter(s => s.status === "done").length;
      const inProgress = steps.filter(s => s.status === "in_progress").length;
      const pending = steps.filter(s => s.status === "pending").length;
      
      return `Switched to feature "${name}" (${done} done, ${inProgress} in progress, ${pending} pending)`;
    },
  });
}

function createStepExecuteTool(directory: string, worktreeService: WorktreeService) {
  return tool({
    description: "Prepare worktree and provide execution context for a step",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
    },
    async execute({ stepFolder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";

      const featurePath = getFeaturePath(directory, featureName);
      const stepPath = path.join(featurePath, "execution", stepFolder);
      const statusPath = path.join(stepPath, "status.json");

      const status = await readJson<StepStatus>(statusPath);
      if (!status) return `Error: Step ${stepFolder} not found.`;

      const worktree = await worktreeService.create(featureName, stepFolder);

      status.status = "in_progress";
      status.startedAt = new Date().toISOString();
      status.execution = {
        worktreeBranch: worktree.branch,
        worktreePath: worktree.path,
        canRevert: false,
      };
      await writeJson(statusPath, status);

      let spec = "(no spec)";
      try { spec = await fs.readFile(path.join(stepPath, "spec.md"), "utf-8"); } catch {}

      return JSON.stringify({
        worktreePath: worktree.path,
        branch: worktree.branch,
        spec,
        instructions: `Work in ${worktree.path}. When done, call hive_step_complete with stepFolder="${stepFolder}".`,
      }, null, 2);
    },
  });
}

function createStepCompleteTool(directory: string, worktreeService: WorktreeService) {
  return tool({
    description: "Complete a step: generate diff, save report, apply changes to main",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name"),
      summary: tool.schema.string().describe("Completion summary"),
      report: tool.schema.object({
        feature: tool.schema.string(),
        status: tool.schema.string(),
        steps: tool.schema.array(tool.schema.object({
          folder: tool.schema.string(),
          name: tool.schema.string(),
          order: tool.schema.number(),
          status: tool.schema.string(),
          summary: tool.schema.string().optional(),
        })),
        decisions: tool.schema.array(tool.schema.string()),
        generatedAt: tool.schema.string(),
      }).optional().describe("Optional ReportJson structure"),
    },
    async execute({ stepFolder, summary, report }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";

      const featurePath = getFeaturePath(directory, featureName);
      const stepPath = path.join(featurePath, "execution", stepFolder);
      const statusPath = path.join(stepPath, "status.json");

      const status = await readJson<StepStatus>(statusPath);
      if (!status) return `Error: Step ${stepFolder} not found.`;

      const diff = await worktreeService.getDiff(featureName, stepFolder);

      if (diff.hasDiff) {
        await fs.writeFile(path.join(stepPath, "output.diff"), diff.diffContent);
      }

      if (report) {
        await writeJson(path.join(stepPath, "report.json"), report);
      }

      const applyResult = await worktreeService.applyDiff(featureName, stepFolder);
      if (!applyResult.success) {
        return `Error applying changes: ${applyResult.error}`;
      }

      status.status = "done";
      status.completedAt = new Date().toISOString();
      status.summary = summary;
      if (status.execution) {
        status.execution.appliedAt = new Date().toISOString();
        status.execution.canRevert = true;
      }
      await writeJson(statusPath, status);

      return JSON.stringify({
        success: true,
        filesAffected: applyResult.filesAffected,
        diffStats: {
          filesChanged: diff.filesChanged.length,
          insertions: diff.insertions,
          deletions: diff.deletions,
        },
      }, null, 2);
    },
  });
}

function createStepRevertTool(directory: string, worktreeService: WorktreeService) {
  return tool({
    description: "Revert a completed step's changes",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name"),
    },
    async execute({ stepFolder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";

      const featurePath = getFeaturePath(directory, featureName);
      const stepPath = path.join(featurePath, "execution", stepFolder);
      const statusPath = path.join(stepPath, "status.json");
      const diffPath = path.join(stepPath, "output.diff");

      const status = await readJson<StepStatus>(statusPath);
      if (!status) return `Error: Step ${stepFolder} not found.`;
      if (!status.execution?.canRevert) return `Error: Step ${stepFolder} cannot be reverted.`;

      try {
        await fs.access(diffPath);
      } catch {
        return `Error: No diff saved for step ${stepFolder}`;
      }

      const diffContent = await fs.readFile(diffPath, "utf-8");
      if (!diffContent.trim()) {
        status.status = "reverted";
        status.execution.canRevert = false;
        delete status.completedAt;
        await writeJson(statusPath, status);
        return JSON.stringify({
          success: true,
          filesReverted: [],
        }, null, 2);
      }

      const conflicts = await worktreeService.checkConflictsFromSavedDiff(diffPath, true);
      if (conflicts.length > 0) {
        return JSON.stringify({
          success: false,
          error: "Revert would cause conflicts",
          conflictFiles: conflicts,
        }, null, 2);
      }

      const revertResult = await worktreeService.revertFromSavedDiff(diffPath);
      if (!revertResult.success) {
        return `Error reverting: ${revertResult.error}`;
      }

      status.status = "reverted";
      status.execution.canRevert = false;
      delete status.completedAt;
      await writeJson(statusPath, status);

      return JSON.stringify({
        success: true,
        filesReverted: revertResult.filesAffected,
      }, null, 2);
    },
  });
}

function createBatchRevertTool(directory: string, worktreeService: WorktreeService) {
  return tool({
    description: "Revert all steps in a batch (by order number)",
    args: {
      batchOrder: tool.schema.number().describe("Batch order number to revert"),
    },
    async execute({ batchOrder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";

      const featurePath = getFeaturePath(directory, featureName);
      const steps = await getSteps(featurePath);

      const batchSteps = steps
        .filter(s => s.order === batchOrder && s.status === "done" && s.execution?.canRevert)
        .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

      if (batchSteps.length === 0) {
        return `No revertible steps found in batch ${batchOrder}.`;
      }

      const results: { folder: string; success: boolean; error?: string }[] = [];

      for (const step of batchSteps) {
        const stepPath = path.join(featurePath, "execution", step.folder);
        const diffPath = path.join(stepPath, "output.diff");

        try {
          await fs.access(diffPath);
        } catch {
          results.push({ folder: step.folder, success: false, error: `No diff saved for step ${step.folder}` });
          continue;
        }

        const diffContent = await fs.readFile(diffPath, "utf-8");
        if (!diffContent.trim()) {
          const statusPath = path.join(stepPath, "status.json");
          const status = await readJson<StepStatus>(statusPath);
          if (status) {
            status.status = "reverted";
            if (status.execution) status.execution.canRevert = false;
            delete status.completedAt;
            await writeJson(statusPath, status);
          }
          results.push({ folder: step.folder, success: true });
          continue;
        }

        const conflicts = await worktreeService.checkConflictsFromSavedDiff(diffPath, true);
        if (conflicts.length > 0) {
          results.push({ folder: step.folder, success: false, error: `Conflicts: ${conflicts.join(", ")}` });
          continue;
        }

        const revertResult = await worktreeService.revertFromSavedDiff(diffPath);
        if (!revertResult.success) {
          results.push({ folder: step.folder, success: false, error: revertResult.error });
          continue;
        }

        const statusPath = path.join(stepPath, "status.json");
        const status = await readJson<StepStatus>(statusPath);
        if (status) {
          status.status = "reverted";
          if (status.execution) status.execution.canRevert = false;
          delete status.completedAt;
          await writeJson(statusPath, status);
        }

        results.push({ folder: step.folder, success: true });
      }

      return JSON.stringify({
        batch: batchOrder,
        results,
        allSuccess: results.every(r => r.success),
      }, null, 2);
    },
  });
}

function createDispatchTool(directory: string) {
  return tool({
    description: "Prepare batch dispatch - returns prompts for agent to execute via background_task",
    args: {
      batch: tool.schema.number().optional().describe("Batch order number to dispatch"),
      stepFolder: tool.schema.string().optional().describe("Or dispatch single step"),
    },
    async execute({ batch, stepFolder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const steps = await getSteps(featurePath);
      
      let requirements = "";
      try { 
        requirements = await fs.readFile(path.join(featurePath, "requirements", "ticket.md"), "utf-8"); 
      } catch {
        try { requirements = await fs.readFile(path.join(featurePath, "problem", "ticket.md"), "utf-8"); } catch {}
      }
      
      const decisions = await getDecisionSummaries(featurePath);
      const completedSummaries = steps
        .filter(s => s.status === "done" && s.summary)
        .map(s => `- ${s.folder}: ${s.summary}`)
        .join("\n") || "(none)";
      
      let targetSteps: typeof steps = [];
      if (stepFolder) {
        targetSteps = steps.filter(s => s.folder === stepFolder && s.status === "pending");
      } else if (batch !== undefined) {
        targetSteps = steps.filter(s => s.order === batch && s.status === "pending");
      } else {
        return "Error: Provide batch number or stepFolder.";
      }
      
      if (targetSteps.length === 0) return "No pending steps to dispatch in specified batch/folder.";
      
      const dispatches = targetSteps.map(step => ({
        folder: step.folder,
        agent: "general",
        prompt: `## Hive Step Execution

**Feature**: ${featureName}
**Step**: ${step.folder} - ${step.name}

### Requirements
${requirements || "(none)"}

### Your Task
${step.spec || "(see spec.md)"}

### Decisions Made
${decisions}

### Prior Steps Completed
${completedSummaries}

### Instructions
1. Execute ONLY this task
2. When complete, call: hive_step_update(stepFolder: "${step.folder}", status: "done", summary: "...", sessionId: "<your-session-id>")
3. If blocked, call with status: "blocked" and explain why
`,
      }));
      
      for (const step of targetSteps) {
        const statusPath = path.join(featurePath, "execution", step.folder, "status.json");
        const status = await readJson<StepStatus>(statusPath);
        if (status) {
          status.status = "in_progress";
          status.startedAt = new Date().toISOString();
          await writeJson(statusPath, status);
        }
      }
      
      return JSON.stringify({
        message: `Dispatch ${dispatches.length} step(s). Use background_task for each:`,
        dispatches,
      }, null, 2);
    },
  });
}

// ============================================================================
// PLUGIN
// ============================================================================

const HIVE_SYSTEM_PROMPT = `
## Hive - Feature Development & Execution System

You have hive tools for planning, tracking, and executing feature development.

### Available Tools

| Tool | Purpose |
|------|---------|
| hive_feature_create | Create new feature, set as active |
| hive_feature_list | List all features |
| hive_feature_switch | Switch to a different feature |
| hive_step_create | Create execution step (same order = parallel) |
| hive_step_update | Update step status/summary |
| hive_step_edit | Edit step spec after creation |
| hive_step_delete | Delete a step from the plan |
| hive_step_reorder | Change step order number |
| hive_step_reset | Reset step to pending (redo) |
| hive_step_execute | Prepare worktree for isolated step execution |
| hive_step_complete | Complete step: generate diff, apply to main |
| hive_step_revert | Revert a completed step's changes |
| hive_batch_revert | Revert all steps in a batch |
| hive_decision | Log architectural decision (CRITICAL during planning) |
| hive_report | Generate status report |
| hive_status | Get current plan state with parallelism info |
| hive_pickup | Get next step, mark in_progress |
| hive_execute | Analyze plan, show execution strategy |
| hive_dispatch | Build prompts for background_task dispatch |

---

### Workflow 4: Revising the Plan

When you need to modify an existing plan:

- **Edit spec**: \`hive_step_edit(stepFolder, spec)\` - updates the Task section
- **Delete step**: \`hive_step_delete(stepFolder, confirm: true)\`
- **Reorder step**: \`hive_step_reorder(stepFolder, newOrder)\`
- **Redo step**: \`hive_step_reset(stepFolder)\` - resets to pending
- **Switch feature**: \`hive_feature_switch(name)\`
- **List features**: \`hive_feature_list()\`

---

### Workflow 1: Planning (when user describes a feature)

1. Call \`hive_feature_create(name, ticket)\`
2. **CRITICAL**: Call \`hive_decision()\` for each design choice during discussion
   - These get auto-injected into step specs
   - Future agents executing steps will have full context
3. Call \`hive_step_create\` for each atomic step
   - Steps with SAME order number = run in parallel
   - Steps with HIGHER order = wait for prior batch
4. Call \`hive_report\` to show the plan

---

### Workflow 2: Execution (when user says "hive execute" or "execute")

1. Call \`hive_execute(dryRun: true)\` to analyze the plan
2. Present execution strategy:
   \`\`\`
   Batch 1 (parallel): 01-setup-db, 02-setup-auth → general agent
   Batch 2: 03-create-api → general agent
   Proceed? [yes/no]
   \`\`\`
3. On confirmation, for each batch:
   a. Call \`hive_dispatch(batch: N)\`
   b. For each dispatch, call \`background_task(agent: dispatch.agent, prompt: dispatch.prompt)\`
   c. Monitor completion via notifications
   d. When batch completes, proceed to next
4. If step fails: report and ask "Retry? Skip? Abort?"
5. Generate final summary with \`hive_report\`

---

### Workflow 3: Single Step (when user says "pickup" or "next step")

1. Call \`hive_pickup(stepFolder?)\` - returns spec with context, marks in_progress
2. Execute the task
3. Call \`hive_step_update(stepFolder, status: "done", summary: "...")\`

---

### Parallelism Rules

- Steps with same \`order\` value run in parallel batches
- Use \`background_task(agent: "general")\` for parallel dispatch
- Each subagent receives: spec + requirements + decisions + prior summaries
- Subagents MUST call \`hive_step_update\` when done

---

### Trigger Keywords

| User says | Action |
|-----------|--------|
| "hive execute" / "execute" | Start Workflow 2 |
| "pickup" / "next step" | Start Workflow 3 |
| "hive status" | Call hive_status |
| "report" | Call hive_report |

DO NOT skip feature tracking. Log decisions during planning. Execute via dispatch.
`;

// ============================================================================
// READ-ONLY TOOLS (for agents to access hive data)
// ============================================================================

function createStepReadTool(directory: string) {
  return tool({
    description: "Read a step's spec and status without modifying it",
    args: {
      stepFolder: tool.schema.string().describe("Step folder name (e.g., 01-setup)"),
    },
    async execute({ stepFolder }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      const stepPath = path.join(featurePath, "execution", stepFolder);
      
      let spec = "(no spec)";
      try { spec = await fs.readFile(path.join(stepPath, "spec.md"), "utf-8"); } catch {}
      
      const status = await readJson<StepStatus>(path.join(stepPath, "status.json"));
      if (!status) return `Error: Step ${stepFolder} not found.`;
      
      return JSON.stringify({
        folder: stepFolder,
        name: status.name,
        order: status.order,
        status: status.status,
        summary: status.summary,
        spec,
      }, null, 2);
    },
  });
}

function createContextListTool(directory: string) {
  return tool({
    description: "List all context/decision files for the active feature",
    args: {},
    async execute() {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const contextPath = path.join(getFeaturePath(directory, featureName), "context");
      
      try {
        const files = await fs.readdir(contextPath);
        const mdFiles = files.filter(f => f.endsWith(".md"));
        
        if (mdFiles.length === 0) return "No context files found.";
        
        return JSON.stringify({
          feature: featureName,
          files: mdFiles,
        }, null, 2);
      } catch {
        return "No context directory found.";
      }
    },
  });
}

function createContextReadTool(directory: string) {
  return tool({
    description: "Read a specific context/decision file",
    args: {
      filename: tool.schema.string().describe("Context file name (e.g., 2026-01-05-use-worktrees.md)"),
    },
    async execute({ filename }) {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const filePath = path.join(getFeaturePath(directory, featureName), "context", filename);
      
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return content;
      } catch {
        return `Error: Context file "${filename}" not found.`;
      }
    },
  });
}

function createRequirementsReadTool(directory: string) {
  return tool({
    description: "Read the requirements/ticket for the active feature",
    args: {},
    async execute() {
      const featureName = await getActiveFeature(directory);
      if (!featureName) return "Error: No active feature.";
      
      const featurePath = getFeaturePath(directory, featureName);
      
      let ticket = "(no ticket)";
      try { 
        ticket = await fs.readFile(path.join(featurePath, "requirements", "ticket.md"), "utf-8"); 
      } catch {
        try { 
          ticket = await fs.readFile(path.join(featurePath, "problem", "ticket.md"), "utf-8"); 
        } catch {}
      }
      
      return ticket;
    },
  });
}

// ============================================================================
// HIVE ENFORCEMENT STATE
// ============================================================================

interface HiveEnforcementState {
  featureKeywordsDetected: boolean;
  hiveFeatureCreated: boolean;
  reminderInjected: boolean;
  lastUserMessage: string;
}

// Session-scoped state (reset per session)
const sessionState = new Map<string, HiveEnforcementState>();

function getSessionState(sessionId: string): HiveEnforcementState {
  if (!sessionState.has(sessionId)) {
    sessionState.set(sessionId, {
      featureKeywordsDetected: false,
      hiveFeatureCreated: false,
      reminderInjected: false,
      lastUserMessage: "",
    });
  }
  return sessionState.get(sessionId)!;
}

// Keywords that indicate feature/build intent
const FEATURE_KEYWORDS = [
  "build", "create", "implement", "add feature", "new feature",
  "develop", "make a", "design", "architect", "let's build",
  "i want to add", "add capability", "create a feature",
];

// Tools that indicate implementation has started (without hive)
const IMPLEMENTATION_TOOLS = [
  "write", "edit", "bash", "task",
];

// Hive tools that satisfy the requirement
const HIVE_TOOLS = [
  "hive_feature_create", "hive_feature_switch", "hive_pickup",
];

function detectFeatureKeywords(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return FEATURE_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

const HIVE_ENFORCEMENT_REMINDER = `
<system-reminder name="HIVE_FEATURE_ENFORCEMENT">
**STOP**: You detected feature/build intent but haven't created a hive feature yet.

Before implementing, you MUST:
1. Call \`hive_feature_create(name, ticket)\` to track this work
2. Or call \`hive_feature_switch(name)\` if resuming existing feature
3. Or call \`hive_pickup()\` if continuing a planned step

This ensures:
- Work is tracked and recoverable
- Context is preserved across sessions
- Decisions are logged for future reference

DO NOT proceed with implementation tools (write, edit, bash, task) until hive is set up.
</system-reminder>
`;

const plugin: Plugin = async (ctx) => {
  const { directory } = ctx;
  const worktreeService = createWorktreeService(directory);

  return {
    "chat.message": async (
      input: { sessionID: string },
      output: { message: unknown; parts: unknown[] }
    ) => {
      const state = getSessionState(input.sessionID);
      const parts = output.parts as Array<{ type?: string; text?: string }>;
      
      for (const part of parts) {
        if (part.type === "text" && typeof part.text === "string") {
          state.lastUserMessage = part.text;
          if (detectFeatureKeywords(part.text)) {
            state.featureKeywordsDetected = true;
            state.reminderInjected = false;
          }
        }
      }
    },

    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      _output: { args: unknown }
    ) => {
      const state = getSessionState(input.sessionID);
      
      if (HIVE_TOOLS.includes(input.tool)) {
        state.hiveFeatureCreated = true;
        return;
      }
      
      if (IMPLEMENTATION_TOOLS.includes(input.tool) && 
          state.featureKeywordsDetected && 
          !state.hiveFeatureCreated) {
        const hasActiveFeature = await getActiveFeature(directory);
        if (hasActiveFeature) {
          state.hiveFeatureCreated = true;
          return;
        }
        
        if (!state.reminderInjected) {
          console.log(`[HIVE ENFORCEMENT] Detected implementation tool "${input.tool}" without hive feature. User message: "${state.lastUserMessage.substring(0, 100)}..."`);
          state.reminderInjected = true;
        }
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      _output: { title: string; output: string; metadata: unknown }
    ) => {
      const state = getSessionState(input.sessionID);
      
      if (HIVE_TOOLS.includes(input.tool)) {
        state.hiveFeatureCreated = true;
      }
    },

    "experimental.chat.system.transform": async (
      _input: unknown,
      output: { system: string[] }
    ) => {
      output.system.push(HIVE_SYSTEM_PROMPT);
    },

    tool: {
      hive_feature_create: createFeatureCreateTool(directory),
      hive_feature_list: createFeatureListTool(directory),
      hive_feature_switch: createFeatureSwitchTool(directory),
      hive_step_create: createStepCreateTool(directory),
      hive_step_update: createStepUpdateTool(directory),
      hive_step_edit: createStepEditTool(directory),
      hive_step_delete: createStepDeleteTool(directory),
      hive_step_reorder: createStepReorderTool(directory),
      hive_step_reset: createStepResetTool(directory),
      hive_step_execute: createStepExecuteTool(directory, worktreeService),
      hive_step_complete: createStepCompleteTool(directory, worktreeService),
      hive_step_revert: createStepRevertTool(directory, worktreeService),
      hive_batch_revert: createBatchRevertTool(directory, worktreeService),
      hive_decision: createDecisionTool(directory),
      hive_report: createReportTool(directory),
      hive_status: createStatusTool(directory),
      hive_pickup: createPickupTool(directory),
      hive_execute: createExecuteTool(directory),
      hive_dispatch: createDispatchTool(directory),
      hive_step_read: createStepReadTool(directory),
      hive_context_list: createContextListTool(directory),
      hive_context_read: createContextReadTool(directory),
      hive_requirements_read: createRequirementsReadTool(directory),
    },

    command: {
      hive: {
        description: "Create a new feature: /hive <feature-name>",
        async run(args: string) {
          const name = args.trim();
          if (!name) return "Usage: /hive <feature-name>";
          return `Create feature "${name}" using hive_feature_create tool. Ask for the problem description.`;
        },
      },
      plan: {
        description: "Generate execution steps for the active feature",
        async run() {
          const featureName = await getActiveFeature(directory);
          if (!featureName) return "No active feature. Use /hive <name> first.";
          
          let problem = "(no ticket)";
          try { problem = await fs.readFile(path.join(getFeaturePath(directory, featureName), "requirements", "ticket.md"), "utf-8"); } catch {
            try { problem = await fs.readFile(path.join(getFeaturePath(directory, featureName), "problem", "ticket.md"), "utf-8"); } catch {}
          }
          
          return `Generate execution steps for "${featureName}".\n\nPROBLEM:\n${problem}\n\nUse hive_step_create for each step.`;
        },
      },
      done: {
        description: "Mark current step as complete",
        async run(args: string) {
          return `Mark current in_progress step as done using hive_step_update with summary: "${args.trim() || "Completed"}"`;
        },
      },
      report: {
        description: "Show feature status report",
        async run() {
          const featureName = await getActiveFeature(directory);
          if (!featureName) return "No active feature. Use /hive <name> first.";
          return `Call hive_report tool to generate the status report for feature "${featureName}".`;
        },
      },
    },
  };
};

export default plugin;
