import * as vscode from 'vscode';
import { ApiEndpoint, HttpMethod, ScannerConfig } from "../../core/types";
import { BaseScanner } from "../base/BaseScanner";
import { FileUtils } from '../../utils/fileSystem';

export class NestScanner extends BaseScanner {
    constructor(config: ScannerConfig) {
        super(config);
    }

    public async scan(folderPath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folderPath, '**/*.{ts,js}')
        );

        await Promise.all(files.map(async file => {
            try {
                const content = await FileUtils.readFileContent(file.fsPath);
                if (this.isValidFile(content)) {
                    const fileEndpoints = await this.parseFile(content, file.fsPath);
                    endpoints.push(...fileEndpoints);
                }
            } catch (error) {
                console.error(`Error processing file ${file.fsPath}:`, error);
            }
        }));

        return endpoints;
    }

    public isValidFile(content: string): boolean {
        return content.includes('@nestjs/common') &&
            (content.includes('@Controller') || 
             content.includes('@Get') || 
             content.includes('@Post') ||
             content.includes('@Put') ||
             content.includes('@Delete'));
    }

    public async parseFile(content: string, filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');
        let currentClass = '';
        let baseRoute = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查控制器装饰器
            if (line.includes('@Controller')) {
                const routeMatch = line.match(/@Controller\(['"]([^'"]*)['"]\)/);
                if (routeMatch) {
                    baseRoute = routeMatch[1];
                }
                // 获取类名
                for (let j = i + 1; j < lines.length; j++) {
                    const classMatch = lines[j].match(/export\s+class\s+(\w+)/);
                    if (classMatch) {
                        currentClass = classMatch[1];
                        break;
                    }
                }
                continue;
            }

            // 检查路由装饰器 - 使用字符串作为键值，而不是直接使用装饰器名
            const decoratorMap: Record<string, HttpMethod> = {
                'Get': 'GET',
                'Post': 'POST',
                'Put': 'PUT',
                'Delete': 'DELETE',
                'Patch': 'PATCH'
            };

            for (const [decorator, method] of Object.entries(decoratorMap)) {
                const decoratorPattern = `@${decorator}`;
                if (line.includes(decoratorPattern)) {
                    const pathMatch = line.match(new RegExp(`${decoratorPattern}\\(['"]([^'"]*)['"](\\)|$)`));
                    const path = pathMatch ? pathMatch[1] : '/';

                    // 获取方法名
                    let methodName = 'unknown';
                    for (let j = i + 1; j < lines.length; j++) {
                        const methodMatch = lines[j].match(/(?:async\s+)?(\w+)\s*\(/);
                        if (methodMatch) {
                            methodName = methodMatch[1];
                            break;
                        }
                    }

                    endpoints.push({
                        apiPath: this.combinePath(baseRoute, path),
                        className: currentClass,
                        methodName: methodName,
                        filePath: filePath,
                        lineNumber: i + 1,
                        language: filePath.endsWith('.ts') ? 'typescript' : 'javascript',
                        httpMethod: method
                    });
                }
            }
        }

        return endpoints;
    }

    private combinePath(...parts: string[]): string {
        const validParts = parts.filter(part => {
            if (part === '/') {return false;}
            return Boolean(part);
        });
        
        const cleanParts = validParts.map(part => 
            part.replace(/^\/+|\/+$/g, '')
        );
        
        return '/' + cleanParts.join('/');
    }
}
