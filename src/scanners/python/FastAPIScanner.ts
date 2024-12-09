import { BaseScanner } from '../base/BaseScanner';
import { ApiEndpoint, ScannerConfig } from '../../core/types';

export class FastAPIScanner extends BaseScanner {
    constructor(config?: ScannerConfig) {
        super(config || {
            fileExtensions: ['py'],
            excludePatterns: ['venv', '__pycache__', 'tests', 'test'],
            maxFileSizeBytes: 1024 * 1024 // 1MB
        });
    }

    async scan(folderPath: string): Promise<ApiEndpoint[]> {
        const files = await this.getFilesToScan(folderPath);
        const endpoints: ApiEndpoint[] = [];

        for (const file of files) {
            if (await this.validateFileSize(file)) {
                const content = await this.readFileContent(file);
                if (this.isValidFile(content)) {
                    const fileEndpoints = await this.parseFile(content, file);
                    endpoints.push(...fileEndpoints);
                }
            }
        }

        return endpoints;
    }

    isValidFile(content: string): boolean {
        // Check if the file contains FastAPI imports
        return content.includes('from fastapi import') || content.includes('import fastapi');
    }

    async parseFile(content: string, filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');
        
        // console.log('Parsing file:', filePath);
        
        // Regular expressions for matching FastAPI decorators
        const decoratorRegex = /@app\.(get|post|put|delete|patch|head|options|trace)\s*\(['"]([^'"]+)['"]/i;
        const routerRegex = /router\.(get|post|put|delete|patch|head|options|trace)\s*\(['"]([^'"]+)['"]/i;
        
        let currentPath = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // console.log('Checking line:', line);
            
            // Check for router prefix
            if (line.includes('@router.prefix')) {
                const match = line.match(/"([^"]+)"/);
                if (match) {
                    currentPath = match[1];
                    // console.log('Found router prefix:', currentPath);
                }
                continue;
            }

            // Check for endpoint decorators
            let match = line.match(decoratorRegex) || line.match(routerRegex);
            if (match) {
                // console.log('Found endpoint decorator:', line);
                const method = match[1].toUpperCase();
                const path = currentPath + match[2];
                
                // Get the function name from the next line
                let functionName = '';
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    const funcMatch = nextLine.match(/(?:async\s+)?def\s+(\w+)/);
                    if (funcMatch) {
                        functionName = funcMatch[1];
                    }
                }
                
                // console.log('Adding endpoint:', method, path, functionName);
                endpoints.push({
                    apiPath: path,
                    className: '', // FastAPI doesn't use classes by default
                    methodName: functionName,
                    filePath,
                    lineNumber: i + 1,
                    language: 'python',
                    httpMethod: method,
                    parameters: [],
                    returnType: ''
                });
            }
        }
        
        // console.log('Found endpoints in file:', endpoints.length);
        return endpoints;
    }

    private extractDocstring(lines: string[], startLine: number): string {
        let docstring = '';
        let i = startLine;
        let inDocstring = false;
        let docstringDelimiter = '';

        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (!inDocstring) {
                if (line.startsWith('"""') || line.startsWith("'''")) {
                    inDocstring = true;
                    docstringDelimiter = line.slice(0, 3);
                    docstring = line.slice(3);
                    if (line.endsWith(docstringDelimiter)) {
                        return docstring.slice(0, -3).trim();
                    }
                } else if (line.startsWith('#')) {
                    return line.slice(1).trim();
                } else {
                    break;
                }
            } else {
                if (line.endsWith(docstringDelimiter)) {
                    docstring += line.slice(0, -3);
                    break;
                }
                docstring += line + '\n';
            }
            i++;
        }

        return docstring.trim();
    }

    private async readFileContent(filePath: string): Promise<string> {
        const fs = require('fs').promises;
        return await fs.readFile(filePath, 'utf8');
    }
}
