export interface ContextFile {
    name: string;
    content: string;
    updatedAt: string;
}
export declare class ContextService {
    private projectRoot;
    constructor(projectRoot: string);
    write(featureName: string, fileName: string, content: string): string;
    read(featureName: string, fileName: string): string | null;
    list(featureName: string): ContextFile[];
    delete(featureName: string, fileName: string): boolean;
    compile(featureName: string): string;
    private normalizeFileName;
}
