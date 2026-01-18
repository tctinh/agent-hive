import { FeatureJson } from '../types.js';
export interface DetectionResult {
    projectRoot: string;
    feature: string | null;
    task: string | null;
    isWorktree: boolean;
    mainProjectRoot: string | null;
}
export declare function detectContext(cwd: string): DetectionResult;
export declare function listFeatures(projectRoot: string): string[];
export declare function getFeatureData(projectRoot: string, featureName: string): FeatureJson | null;
export declare function findProjectRoot(startDir: string): string | null;
