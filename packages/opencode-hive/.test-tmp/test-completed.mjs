import fs from 'fs/promises';
import path from 'path';
import { StepService } from './dist/services/stepService.js';
import { FeatureService } from './dist/services/featureService.js';

const tempDir = '/tmp/test-hive-' + Date.now();
await fs.mkdir(tempDir, { recursive: true });

try {
  const featureService = new FeatureService(tempDir);
  const stepService = new StepService(tempDir);
  
  await featureService.create("test-feature", "Test ticket");
  console.log("Feature created");
  
  const feature = await featureService.get("test-feature");
  console.log("Feature status:", feature?.status);
  
  await featureService.complete("test-feature");
  console.log("Feature completed");
  
  const featureAfter = await featureService.get("test-feature");
  console.log("Feature status after complete:", featureAfter?.status);
  
  try {
    await stepService.create("test-feature", "new-step", 2, "New step");
    console.log("ERROR: Step creation succeeded when it should have failed");
    process.exit(1);
  } catch (err) {
    console.log("SUCCESS: Step creation rejected:", err.message);
    if (!err.message.includes("completed")) {
      console.log("ERROR: Message does not include 'completed'");
      process.exit(1);
    }
  }
  console.log("All checks passed!");
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
