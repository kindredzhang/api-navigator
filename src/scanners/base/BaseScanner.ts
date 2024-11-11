import { ApiEndpoint, ScannerConfig } from '../../core/types';
import { FileUtils } from '../../utils/fileSystem';
import * as vscode from 'vscode';
export abstract class BaseScanner {
    protected config: ScannerConfig;

    constructor(config: ScannerConfig) {
        this.config = config;
    }

    abstract scan(folderPath: string): Promise<ApiEndpoint[]>;
    abstract isValidFile(content: string): boolean;
    abstract parseFile(content: string, filePath: string): Promise<ApiEndpoint[]>;

    protected async getFilesToScan(folderPath: string): Promise<string[]> {
        const files = await FileUtils.findFiles(
            `**/*.{${this.config.fileExtensions.join(',')}}`,
            vscode.Uri.file(folderPath)
        );
        
        return files
            .filter(file => !this.config.excludePatterns.some(pattern => 
                file.fsPath.includes(pattern)
            ))
            .map(file => file.fsPath);
    }

    protected async validateFileSize(filePath: string): Promise<boolean> {
        if (!this.config.maxFileSizeBytes) {return true;}
        const content = await FileUtils.readFileContent(filePath);
        return content.length <= this.config.maxFileSizeBytes;
    }
} 