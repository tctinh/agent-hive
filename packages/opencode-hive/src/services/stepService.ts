import * as fs from "fs/promises";
import * as path from "path";
import type { StepStatus, StepWithFolder, BatchInfo, FeatureStatus } from "../types.js";
import {
  getFeaturePath,
  getExecutionPath,
  getStepPath,
} from "../utils/paths.js";
import { ensureDir, readFile, writeJson, readJson, fileExists } from "../utils/json.js";
import { validateStepName, validateStepOrder, validateStepFolder } from "../utils/validation.js";
import { assertStepMutable, assertFeatureMutable } from "../utils/immutability.js";

export class StepService {
  constructor(
    private directory: string,
    private featureService?: { get(name: string): Promise<FeatureStatus | null> }
  ) {}

  private async getFeature(featureName: string): Promise<FeatureStatus | null> {
    if (this.featureService) {
      return this.featureService.get(featureName);
    }
    const featurePath = getFeaturePath(this.directory, featureName);
    return readJson<FeatureStatus>(path.join(featurePath, "feature.json"));
  }

  async create(featureName: string, name: string, order: number, spec: string): Promise<{ folder: string }> {
    const nameValidation = validateStepName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const orderValidation = validateStepOrder(order);
    if (!orderValidation.valid) {
      throw new Error(orderValidation.error);
    }

    if (this.featureService) {
      const feature = await this.featureService.get(featureName);
      if (feature) {
        await assertFeatureMutable(feature, featureName);
      }
    }

    const featurePath = getFeaturePath(this.directory, featureName);
    const stepFolder = `${String(order).padStart(2, "0")}-${name}`;
    const stepPath = getStepPath(featurePath, stepFolder);

    const exists = await fileExists(stepPath);
    if (exists) {
      throw new Error(`Step folder "${stepFolder}" already exists`);
    }

    await ensureDir(stepPath);

    const status: StepStatus = {
      name,
      order,
      status: "pending",
    };

    await writeJson(path.join(stepPath, "status.json"), status);
    await fs.writeFile(path.join(stepPath, "spec.md"), spec);

    return { folder: stepFolder };
  }

  async read(featureName: string, stepFolder: string): Promise<StepWithFolder | null> {
    const stepPath = getStepPath(getFeaturePath(this.directory, featureName), stepFolder);

    const status = await readJson<StepStatus>(path.join(stepPath, "status.json"));
    if (!status) {
      return null;
    }

    let spec: string | undefined;
    try {
      spec = await fs.readFile(path.join(stepPath, "spec.md"), "utf-8");
    } catch {}

    return { ...status, folder: stepFolder, spec };
  }

  async list(featureName: string): Promise<StepWithFolder[]> {
    const executionPath = getExecutionPath(getFeaturePath(this.directory, featureName));
    const steps: StepWithFolder[] = [];

    try {
      const entries = await fs.readdir(executionPath, { withFileTypes: true });
      for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        const status = await readJson<StepStatus>(path.join(executionPath, entry.name, "status.json"));
        if (status) {
          let spec: string | undefined;
          try {
            spec = await fs.readFile(path.join(executionPath, entry.name, "spec.md"), "utf-8");
          } catch {}
          steps.push({ ...status, folder: entry.name, spec });
        }
      }
    } catch {}

    return steps;
  }

  async update(
    featureName: string,
    stepFolder: string,
    updates: {
      status?: StepStatus["status"];
      order?: number;
      summary?: string;
      sessionId?: string;
      spec?: string;
      clearSummary?: boolean;
    }
  ): Promise<{ updated: boolean; newFolder?: string }> {
    const folderValidation = validateStepFolder(stepFolder);
    if (!folderValidation.valid) {
      throw new Error(folderValidation.error);
    }

    const feature = await this.getFeature(featureName);
    if (!feature) {
      throw new Error(`Feature "${featureName}" not found`);
    }

    await assertFeatureMutable(feature, featureName);

    const stepPath = getStepPath(getFeaturePath(this.directory, featureName), stepFolder);
    const statusPath = path.join(stepPath, "status.json");

    const status = await readJson<StepStatus>(statusPath);
    if (!status) {
      throw new Error(`Step "${stepFolder}" not found`);
    }

    if (updates.status && updates.status !== status.status) {
      await assertStepMutable(status.status, stepFolder);
      status.status = updates.status;
      if (updates.status === "in_progress" && !status.startedAt) {
        status.startedAt = new Date().toISOString();
      }
      if (updates.status === "done") {
        status.completedAt = new Date().toISOString();
      }
    }

    if (updates.order !== undefined) {
      const orderValidation = validateStepOrder(updates.order);
      if (!orderValidation.valid) {
        throw new Error(orderValidation.error);
      }
      status.order = updates.order;
    }

    if (updates.clearSummary) {
      delete status.summary;
    }

    if (updates.summary !== undefined) {
      status.summary = updates.summary;
    }

    if (updates.sessionId !== undefined) {
      status.sessionId = updates.sessionId;
    }

    await writeJson(statusPath, status);

    if (updates.spec !== undefined) {
      await fs.writeFile(path.join(stepPath, "spec.md"), updates.spec);
    }

    let newFolder: string | undefined;
    if (updates.order !== undefined) {
      const newOrderStr = String(updates.order).padStart(2, "0");
      const folderParts = stepFolder.split("-");
      const stepName = folderParts.slice(1).join("-") || status.name;
      newFolder = `${newOrderStr}-${stepName}`;

      if (newFolder !== stepFolder) {
        const newPath = getStepPath(getFeaturePath(this.directory, featureName), newFolder);
        await fs.rename(stepPath, newPath);
        return { updated: true, newFolder };
      }
    }

    return { updated: true };
  }

  async delete(featureName: string, stepFolder: string): Promise<{ deleted: boolean }> {
    const folderValidation = validateStepFolder(stepFolder);
    if (!folderValidation.valid) {
      throw new Error(folderValidation.error);
    }

    const feature = await this.getFeature(featureName);
    if (!feature) {
      throw new Error(`Feature "${featureName}" not found`);
    }

    await assertFeatureMutable(feature, featureName);

    const stepPath = getStepPath(getFeaturePath(this.directory, featureName), stepFolder);

    const exists = await fileExists(stepPath);
    if (!exists) {
      throw new Error(`Step "${stepFolder}" not found`);
    }

    await fs.rm(stepPath, { recursive: true });

    return { deleted: true };
  }

  async getBatches(featureName: string): Promise<BatchInfo[]> {
    const steps = await this.list(featureName);
    const batches: Record<number, BatchInfo> = {};

    for (const step of steps) {
      if (!batches[step.order]) {
        batches[step.order] = {
          order: step.order,
          parallel: false,
          steps: [],
        };
      }
      batches[step.order].steps.push({
        folder: step.folder,
        name: step.name,
        status: step.status,
      });
    }

    for (const key of Object.keys(batches)) {
      const batch = batches[Number(key)];
      batch.parallel = batch.steps.length > 1;
    }

    return Object.values(batches).sort((a, b) => a.order - b.order);
  }

  async getNextPending(featureName: string): Promise<StepWithFolder | null> {
    const steps = await this.list(featureName);
    const stepsByOrder = steps.filter((s) => s.status === "pending").sort((a, b) => a.order - b.order);
    return stepsByOrder[0] || null;
  }

  async getByFolder(featureName: string, stepFolder: string): Promise<StepWithFolder | null> {
    return this.read(featureName, stepFolder);
  }

  async getByOrder(featureName: string, order: number): Promise<StepWithFolder[]> {
    const steps = await this.list(featureName);
    return steps.filter((s) => s.order === order);
  }
}
