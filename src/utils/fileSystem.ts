import * as vscode from 'vscode';
import * as fs from 'fs/promises';

export class FileUtils {
    private static cache: Map<string, string> = new Map();
    private static readonly MAX_CACHE_SIZE = 100;

    public static async readFile(filePath: string): Promise<string> {
        const cached = this.cache.get(filePath);
        if (cached) {
            return cached;
        }

        const content = await fs.readFile(filePath, 'utf8');
        
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = Array.from(this.cache.keys())[0];
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        
        this.cache.set(filePath, content);
        return content;
    }

    public static async findFiles(pattern: string, folder?: vscode.Uri): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder || vscode.workspace.workspaceFolders![0], pattern)
        );
    }

    public static async exists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    public static clearCache(): void {
        this.cache.clear();
    }

    public static async readFileContent(filePath: string): Promise<string> {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
        return Buffer.from(content).toString('utf-8');
    }
} 