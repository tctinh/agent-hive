export interface Ask {
    id: string;
    question: string;
    feature: string;
    timestamp: string;
    answered: boolean;
}
export interface AskAnswer {
    id: string;
    answer: string;
    timestamp: string;
}
export declare class AskService {
    private projectRoot;
    constructor(projectRoot: string);
    private getAsksDir;
    private ensureAsksDir;
    createAsk(feature: string, question: string): Ask;
    isLocked(feature: string, askId: string): boolean;
    getAnswer(feature: string, askId: string): AskAnswer | null;
    submitAnswer(feature: string, askId: string, answer: string): void;
    listPending(feature: string): Ask[];
    cleanup(feature: string, askId: string): void;
}
