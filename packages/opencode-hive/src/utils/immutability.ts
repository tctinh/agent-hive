import { StepStatusType, FeatureStatus } from "../types.js";

export class ImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImmutabilityError";
  }
}

export async function assertFeatureMutable(featureStatus: FeatureStatus, featureName: string): Promise<void> {
  if (featureStatus.status === "completed" || featureStatus.status === "archived") {
    throw new ImmutabilityError(
      `Feature "${featureName}" is ${featureStatus.status} and cannot be modified. ` +
      `Create a new feature for additional changes.`
    );
  }
}

export async function assertStepMutable(stepStatus: StepStatusType, stepName: string): Promise<void> {
  if (stepStatus === "done") {
    throw new ImmutabilityError(
      `Step "${stepName}" is already completed and cannot be modified. ` +
      `Use hive_exec_revert if you need to undo changes.`
    );
  }
}

export function isImmutable(featureStatus: FeatureStatus): boolean {
  return featureStatus.status === "completed" || featureStatus.status === "archived";
}
