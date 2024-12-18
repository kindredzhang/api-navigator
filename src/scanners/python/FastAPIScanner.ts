import { BaseScanner } from '../base/BaseScanner';
import { ApiEndpoint, HttpMethod, ScannerConfig } from '../../core/types';
import { FileUtils } from '../../utils/fileSystem';

export class FastAPIScanner extends BaseScanner {
    // 改为 camelCase 格式
    private static readonly decoratorPatterns = [
        /@app\.(get|post|put|delete|patch|head|options|trace)\s*\(['"]([^'"]+)['"]/i,
        /router\.(get|post|put|delete|patch|head|options|trace)\s*\(['"]([^'"]+)['"]/i,
        /app\.(get|post|put|delete|patch|head|options|trace)\s*\(['"]([^'"]+)['"]/i,
        /^router\.(get|post|put|delete|patch|head|options|trace)\s*\(['"]([^'"]+)['"]/i
    ];

    private static readonly apiRouterPrefixRegex = /prefix=["']([^"']+)["']/;
    private static readonly tagsRegex = /tags=\[([^\]]+)\]/;
    private static readonly functionRegex = /(?:async\s+)?def\s+(\w+)/;

    constructor(config?: ScannerConfig) {
        super(config || {
            fileExtensions: ['py'],
            excludePatterns: ['venv', '__pycache__', 'tests', 'test'],
            maxFileSizeBytes: 1024 * 1024 // 1MB
        });
    }

    public async scan(folderPath: string): Promise<ApiEndpoint[]> {
        const files = await this.getFilesToScan(folderPath);
        const endpointPromises = files.map(file => this.processFile(file));
        const endpointArrays = await Promise.all(endpointPromises);
        
        return endpointArrays.flat();
    }

    private async processFile(file: string): Promise<ApiEndpoint[]> {
        if (!(await this.validateFileSize(file))) {
            return [];
        }

        const content = await this.readFileContent(file);
        if (!this.isValidFile(content)) {
            return [];
        }

        return this.parseFile(content, file);
    }

    public isValidFile(content: string): boolean {
        const hasImport = content.includes('from fastapi import') || 
                         content.includes('import fastapi');
        
        if (!hasImport) {
            return false;
        }

        return content.includes('FastAPI') || 
               content.includes('APIRouter') || 
               content.includes('@app.') || 
               content.includes('@router.');
    }

    public async parseFile(content: string, filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');
        
        let currentPath = '';
        let currentTags: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('APIRouter(prefix=')) {
                const match = line.match(FastAPIScanner.apiRouterPrefixRegex);
                if (match) {
                    currentPath = match[1];
                    continue;
                }
            }

            if (line.includes('tags=')) {
                const match = line.match(FastAPIScanner.tagsRegex);
                if (match) {
                    currentTags = match[1].split(',').map(tag => 
                        tag.trim().replace(/['"]/g, '')
                    );
                }
            }

            const endpoint = this.parseEndpoint(line, i, lines, currentPath, currentTags, filePath);
            if (endpoint) {
                endpoints.push(endpoint);
            }
        }
        
        return endpoints;
    }

    private parseEndpoint(
        line: string, 
        lineIndex: number, 
        lines: string[], 
        currentPath: string, 
        currentTags: string[],
        filePath: string
    ): ApiEndpoint | null {
        for (const pattern of FastAPIScanner.decoratorPatterns) {
            const match = line.match(pattern);
            if (!match) {
                continue;
            }

            const method = match[1].toUpperCase();
            const path = currentPath + match[2];
            
            let functionName = '';
            if (lineIndex + 1 < lines.length) {
                const nextLine = lines[lineIndex + 1].trim();
                const funcMatch = nextLine.match(FastAPIScanner.functionRegex);
                if (funcMatch) {
                    functionName = funcMatch[1];
                }
            }
            
            return {
                apiPath: path,
                className: currentTags.join(', ') || '',
                methodName: functionName,
                filePath,
                lineNumber: lineIndex + 1,
                language: 'python',
                httpMethod: method as HttpMethod,
                parameters: [],
                returnType: ''
            };
        }

        return null;
    }

    private async readFileContent(filePath: string): Promise<string> {
        return await FileUtils.readFileContent(filePath);
    }
}
