import * as path from "path";

export function getHivePath(directory: string): string {
  return path.join(directory, ".hive");
}

export function getFeaturePath(directory: string, featureName: string): string {
  return path.join(getHivePath(directory), "features", featureName);
}

export function getExecutionPath(featurePath: string): string {
  return path.join(featurePath, "execution");
}

export function getStepPath(featurePath: string, stepFolder: string): string {
  return path.join(getExecutionPath(featurePath), stepFolder);
}

export function getContextPath(featurePath: string): string {
  return path.join(featurePath, "context");
}

export function getRequirementsPath(featurePath: string): string {
  return path.join(featurePath, "requirements");
}

export function getActiveFeaturePath(directory: string): string {
  return path.join(getHivePath(directory), "active-feature.txt");
}

export function getDecisionFilename(title: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return `${timestamp}-${slug}.md`;
}
