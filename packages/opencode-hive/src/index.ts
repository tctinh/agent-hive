import { tool, type Plugin } from "@opencode-ai/plugin";
import { createWorktreeService } from "./services/worktreeService.js";
import { FeatureService } from "./services/featureService.js";
import { StepService } from "./services/stepService.js";
import { DecisionService } from "./services/decisionService.js";
import { StatusService } from "./services/statusService.js";

import { createFeatureCreateTool, createFeatureListTool, createFeatureSwitchTool, createFeatureCompleteTool } from "./tools/featureTools.js";
import { createStepCreateTool, createStepReadTool, createStepUpdateTool, createStepDeleteTool, createStepListTool } from "./tools/stepTools.js";
import { createDecisionLogTool, createDecisionListTool } from "./tools/decisionTools.js";
import { createExecStartTool, createExecCompleteTool, createExecAbortTool, createExecRevertTool } from "./tools/execTools.js";
import { createStatusTool } from "./tools/queryTools.js";

const HIVE_SYSTEM_PROMPT = `
## Hive - Feature Development & Execution System

You have hive tools for planning, tracking, and executing feature development.

### Available Tools (16 Core Tools)

#### Feature Domain (5 tools)
| Tool | Purpose |
|------|---------|
| hive_feature_create | Create new feature, set as active |
| hive_feature_list | List all features |
| hive_feature_switch | Change active feature |
| hive_feature_complete | Mark as completed (immutable) |
| hive_status | Show active feature + all details |

#### Step Domain (5 tools)
| Tool | Purpose |
|------|---------|
| hive_step_create | Create step |
| hive_step_read | Read step details |
| hive_step_update | Update spec/order/status/summary |
| hive_step_delete | Delete step |
| hive_step_list | List all steps |

#### Decision Domain (2 tools)
| Tool | Purpose |
|------|---------|
| hive_decision_log | Log decision |
| hive_decision_list | List all with full content |

#### Execution Domain (4 tools)
| Tool | Purpose |
|------|---------|
| hive_exec_start | Create worktree, begin work |
| hive_exec_complete | Apply changes, mark done |
| hive_exec_abort | Abandon worktree, reset step |
| hive_exec_revert | Revert completed step |

---

### Workflow: Planning

1. Call \`hive_feature_create(name, ticket)\` to start
2. Call \`hive_decision_log(title, content)\` for each design choice
3. Call \`hive_step_create(name, order, spec)\` for each step
4. Call \`hive_status\` to see the plan

### Workflow: Execution

1. Call \`hive_exec_start(stepFolder)\` to create worktree
2. Work in the returned worktree path
3. Call \`hive_exec_complete(stepFolder, summary)\` to finish

### Workflow: Recovery

- Abandon: \`hive_exec_abort(stepFolder)\` - discard work
- Revert: \`hive_exec_revert(stepFolder)\` - undo completed changes

### Parallelism Rules

- Steps with same \`order\` value run in parallel batches
- Check \`hive_status\` batches to see parallelization

---

### Feature Lifecycle

PLANNING → IN_PROGRESS → COMPLETED (immutable)

Once completed, features are read-only. Create a new feature for changes.
`;

const plugin: Plugin = async (ctx) => {
  const { directory } = ctx;

  const worktreeService = createWorktreeService(directory);
  const featureService = new FeatureService(directory);
  const stepService = new StepService(directory, featureService);
  const decisionService = new DecisionService(directory, featureService);

  (featureService as any).stepService = stepService;
  (featureService as any).decisionService = decisionService;

  const statusService = new StatusService(featureService, stepService, decisionService);

  return {
    "experimental.chat.system.transform": async (_input: unknown, output: { system: string[] }) => {
      output.system.push(HIVE_SYSTEM_PROMPT);
    },

    tool: {
      hive_feature_create: createFeatureCreateTool(featureService),
      hive_feature_list: createFeatureListTool(featureService),
      hive_feature_switch: createFeatureSwitchTool(featureService),
      hive_feature_complete: createFeatureCompleteTool(featureService),

      hive_step_create: createStepCreateTool(stepService, featureService, decisionService),
      hive_step_read: createStepReadTool(stepService, featureService),
      hive_step_update: createStepUpdateTool(stepService, featureService),
      hive_step_delete: createStepDeleteTool(stepService, featureService),
      hive_step_list: createStepListTool(stepService, featureService),

      hive_decision_log: createDecisionLogTool(decisionService, featureService),
      hive_decision_list: createDecisionListTool(decisionService, featureService),

      hive_exec_start: createExecStartTool(worktreeService, stepService, featureService, directory),
      hive_exec_complete: createExecCompleteTool(worktreeService, stepService, featureService, directory),
      hive_exec_abort: createExecAbortTool(worktreeService, stepService, featureService, directory),
      hive_exec_revert: createExecRevertTool(worktreeService, stepService, featureService, directory),

      hive_status: createStatusTool(featureService, stepService, decisionService),
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
    },
  };
};

export default plugin;
