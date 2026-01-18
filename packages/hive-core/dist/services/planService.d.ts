import { PlanComment, PlanReadResult } from '../types.js';
export declare class PlanService {
    private projectRoot;
    constructor(projectRoot: string);
    write(featureName: string, content: string): string;
    read(featureName: string): PlanReadResult | null;
    approve(featureName: string): void;
    isApproved(featureName: string): boolean;
    revokeApproval(featureName: string): void;
    getComments(featureName: string): PlanComment[];
    addComment(featureName: string, comment: Omit<PlanComment, 'id' | 'timestamp'>): PlanComment;
    updateComment(featureName: string, commentId: string, body: string): PlanComment | null;
    deleteComment(featureName: string, commentId: string): boolean;
    clearComments(featureName: string): void;
}
