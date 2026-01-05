import { tool } from "@opencode-ai/plugin";
import { FeatureService } from "../services/featureService.js";


export function createFeatureCreateTool(featureService: FeatureService) {
  return tool({
    description: "Create a new feature in .hive/features/. Sets it as active.",
    args: {
      name: tool.schema.string().describe("Feature name (kebab-case)"),
      ticket: tool.schema.string().describe("Problem description / ticket content"),
    },
    async execute({ name, ticket }) {
      const result = await featureService.create(name, ticket);
      return `Feature "${name}" created at .hive/features/${name}/`;
    },
  });
}

export function createFeatureListTool(featureService: FeatureService) {
  return tool({
    description: "List all features in .hive/features/",
    args: {},
    async execute() {
      const features = await featureService.list();

      if (features.length === 0) {
        return "No features found. Use hive_feature_create to create one.";
      }

      const result = features.map((f) => ({
        name: f.name,
        status: f.status,
        createdAt: f.createdAt,
      }));

      return JSON.stringify({ features: result }, null, 2);
    },
  });
}

export function createFeatureSwitchTool(featureService: FeatureService) {
  return tool({
    description: "Switch active feature to work on a different one",
    args: {
      name: tool.schema.string().describe("Feature name to switch to"),
    },
    async execute({ name }) {
      const { feature } = await featureService.switch(name);
      return `Switched to feature "${name}" (status: ${feature.status})`;
    },
  });
}

export function createFeatureCompleteTool(featureService: FeatureService) {
  return tool({
    description: "Mark a feature as completed (immutable)",
    args: {
      name: tool.schema.string().describe("Feature name to complete"),
      force: tool.schema.boolean().optional().describe("Force completion even with incomplete steps"),
    },
    async execute({ name, force }) {
      const result = await featureService.complete(name, force ?? false);
      return `Feature "${name}" marked as completed (now immutable). Report saved to ${result.reportPath}`;
    },
  });
}
