import * as vscode from 'vscode';
import { ApiEndpoint, HttpMethod } from '../../core/types';
import { BaseScanner } from '../base/BaseScanner';
import { FileUtils } from '../../utils/fileSystem';

export class SpringBootScanner extends BaseScanner {
    private contextPath: string = '';

    public async scan(folderPath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, '**/*.java'));
        
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
        const controllerAnnotations = [
            '@RestController',
            '@Controller',
            '@RequestMapping'
        ];
        return controllerAnnotations.some(annotation => content.includes(annotation));
    }

    public async parseFile(content: string, filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');
        let currentClass = '';
        let baseUrl = '';
        let isController = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('@RestController') || line.includes('@Controller')) {
                isController = true;
            }

            if (line.includes('@RequestMapping')) {
                const match = line.match(/["]([^"]+)["]/);
                if (match) {
                    baseUrl = match[1];
                    if (baseUrl === '/') {
                        baseUrl = '';
                    }
                }
            }

            if (line.includes('class')) {
                const classMatch = line.match(/class\s+(\w+)/);
                if (classMatch) {
                    currentClass = classMatch[1];
                }
            }

            if (!isController) {
                continue;
            }

            const mappingTypes = [
                '@GetMapping',
                '@PostMapping',
                '@PutMapping',
                '@DeleteMapping',
                '@PatchMapping',
                '@RequestMapping'
            ];

            for (const mappingType of mappingTypes) {
                if (line.includes(mappingType)) {
                    const pathMatch = line.match(/["]([^"]+)["]/);
                    const valueMatch = line.match(/value\s*=\s*"([^"]+)"/);
                    const pathVarMatch = line.match(/path\s*=\s*"([^"]+)"/);
                    
                    const methodPath = pathMatch?.[1] || valueMatch?.[1] || pathVarMatch?.[1] || '';
                    
                    let methodName = '';
                    for (let j = i + 1; j < lines.length && !methodName; j++) {
                        const methodLine = lines[j].trim();
                        const methodMatch = methodLine.match(/\s*(?:public|private|protected)?\s+\w+\s+(\w+)\s*\(/);
                        if (methodMatch) {
                            methodName = methodMatch[1];
                            break;
                        }
                    }

                    if (methodName) {
                        endpoints.push({
                            apiPath: this.combinePath(this.contextPath, baseUrl, methodPath),
                            className: currentClass,
                            methodName: methodName,
                            filePath: filePath,
                            lineNumber: i + 1,
                            language: 'java',
                            httpMethod: this.getHttpMethod(mappingType)
                        });
                    }
                }
            }
        }

        return endpoints;
    }

    private combinePath(...parts: string[]): string {
        const validParts = parts.filter(part => {
            if (part === '/') {
                return false;
            }
            return Boolean(part);
        });
        
        const cleanParts = validParts.map(part => 
            part.replace(/^\/+|\/+$/g, '')
        );
        
        return '/' + cleanParts.join('/');
    }

    private getHttpMethod(mappingType: string): HttpMethod {
        const methodMap: Record<string, HttpMethod> = {
            '@GetMapping': 'GET',
            '@PostMapping': 'POST',
            '@PutMapping': 'PUT',
            '@DeleteMapping': 'DELETE',
            '@PatchMapping': 'PATCH',
            '@RequestMapping': 'GET'
        };
        return methodMap[mappingType];
    }
}
