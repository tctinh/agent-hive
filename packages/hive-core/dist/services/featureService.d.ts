import { FeatureJson, FeatureStatusType, FeatureInfo } from '../types.js';
export declare class FeatureService {
    private projectRoot;
    constructor(projectRoot: string);
    create(name: string, ticket?: string): FeatureJson;
    get(name: string): FeatureJson | null;
    list(): string[];
    getActive(): FeatureJson | null;
    updateStatus(name: string, status: FeatureStatusType): FeatureJson;
    getInfo(name: string): FeatureInfo | null;
    private getTasks;
    complete(name: string): FeatureJson;
    setSession(name: string, sessionId: string): void;
    getSession(name: string): string | undefined;
}
