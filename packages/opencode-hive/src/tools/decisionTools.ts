import { tool } from "@opencode-ai/plugin";
import { DecisionService } from "../services/decisionService.js";
import { FeatureService } from "../services/featureService.js";
import { assertFeatureMutable } from "../utils/immutability.js";

export function createDecisionLogTool(decisionService: DecisionService, featureService: FeatureService) {
  return tool({
    description: "Log an architectural decision to context/",
    args: {
      title: tool.schema.string().describe("Decision title"),
      content: tool.schema.string().describe("Decision content (markdown)"),
    },
    async execute({ title, content }) {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const feature = await featureService.get(featureName);
      if (feature) {
        await assertFeatureMutable(feature, featureName);
      }

      const { filename } = await decisionService.log(featureName, title, content);

      return `Decision logged: ${filename}`;
    },
  });
}

export function createDecisionListTool(decisionService: DecisionService, featureService: FeatureService) {
  return tool({
    description: "List all decisions with full content for the active feature",
    args: {},
    async execute() {
      const featureName = await featureService.getActive();
      if (!featureName) {
        return "Error: No active feature.";
      }

      const decisions = await decisionService.list(featureName);

      if (decisions.length === 0) {
        return "No decisions found.";
      }

      return JSON.stringify(
        {
          feature: featureName,
          decisions: decisions.map((d) => ({
            filename: d.filename,
            title: d.title,
            loggedAt: d.loggedAt,
            content: d.content,
          })),
        },
        null,
        2
      );
    },
  });
}
