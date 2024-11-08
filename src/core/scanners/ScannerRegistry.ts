import { Scanner } from '../types';
import { ProjectType } from '../types';

export class ScannerRegistry {
    private static instance: ScannerRegistry;
    private scanners: Map<ProjectType, Scanner> = new Map();

    private constructor() {}

    public static getInstance(): ScannerRegistry {
        if (!this.instance) {
            this.instance = new ScannerRegistry();
        }
        return this.instance;
    }

    public registerScanner(type: ProjectType, scanner: Scanner): void {
        this.scanners.set(type, scanner);
    }

    public getScanner(type: ProjectType): Scanner | undefined {
        return this.scanners.get(type);
    }

    public getSupportedTypes(): ProjectType[] {
        return Array.from(this.scanners.keys());
    }
} 