import * as vscode from 'vscode';
import { ApiEndpoint } from '../models/ApiEndpoint';
import * as fs from 'fs';

export class ApiEndpointProvider {
    private static instance: ApiEndpointProvider;
    private endpoints: ApiEndpoint[] = [];
    private contextPath: string = '';

    // 添加缓存机制
    private cache: Map<string, ApiEndpoint[]> = new Map();
    private lastScanTime: number = 0;
    private readonly CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes cache

    private fileContentCache: Map<string, string> = new Map();
    private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached files

    private constructor() {}

    public static getInstance(): ApiEndpointProvider {
        if (!ApiEndpointProvider.instance) {
            ApiEndpointProvider.instance = new ApiEndpointProvider();
        }
        return ApiEndpointProvider.instance;
    }

    public async scanWorkspace(): Promise<void> {
        this.endpoints = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            // Detect project type
            const projectType = await this.detectProjectType(folder.uri.fsPath);
            if (projectType === 'spring-boot') {
                await this.scanSpringBootProject(folder.uri.fsPath);
            }
        }
    }

    private async detectProjectType(folderPath: string): Promise<string> {
        try {
            // Add debugging logs
            console.log('Scanning project at:', folderPath);
            
            const pomFiles = await vscode.workspace.findFiles('**/pom.xml');
            console.log('Found pom files:', pomFiles);
            
            if (pomFiles.length > 0) {
                const content = await fs.promises.readFile(pomFiles[0].fsPath, 'utf8');
                console.log('Pom content contains spring-boot:', content.includes('spring-boot'));
                if (content.includes('spring-boot')) {
                    return 'spring-boot';
                }
            }
        } catch (error) {
            console.error('Error detecting project type:', error);
        }
        return 'unknown';
    }

    private async scanSpringBootProject(folderPath: string): Promise<void> {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, '**/*.java'));
        
        // Process files in parallel
        await Promise.all(files.map(async file => {
            try {
                const content = await this.readFileContent(file.fsPath);
                if (this.isControllerFile(content)) {
                    await this.parseJavaFile(content, file.fsPath);
                }
            } catch (error) {
                console.error(`Error processing file ${file.fsPath}:`, error);
            }
        }));
    }

    private isControllerFile(content: string): boolean {
        const controllerAnnotations = [
            '@RestController',
            '@Controller',
            '@RequestMapping'
        ];
        return controllerAnnotations.some(annotation => 
            content.includes(annotation)
        );
    }

    private async parseJavaFile(content: string, filePath: string): Promise<void> {
        const lines = content.split('\n');
        let currentClass = '';
        let baseUrl = '';
        let isController = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check class-level annotations
            if (line.includes('@RestController') || line.includes('@Controller')) {
                isController = true;
            }

            // Parse class-level RequestMapping
            if (line.includes('@RequestMapping')) {
                const match = line.match(/["]([^"]+)["]/);
                if (match) {
                    baseUrl = match[1];
                    // If the RequestMapping value is just "/", set it to an empty string
                    if (baseUrl === '/') {
                        baseUrl = '';
                    }
                }
            }

            // Parse class name
            if (line.includes('class')) {
                const classMatch = line.match(/class\s+(\w+)/);
                if (classMatch) {
                    currentClass = classMatch[1];
                }
            }

            // Only parse methods in Controller classes
            if (!isController) {
                continue;
            }

            // Parse method-level Mapping annotations
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
                    // Support more complex path formats
                    const pathMatch = line.match(/["]([^"]+)["]/);
                    const valueMatch = line.match(/value\s*=\s*"([^"]+)"/);
                    const pathVarMatch = line.match(/path\s*=\s*"([^"]+)"/);
                    
                    const methodPath = pathMatch?.[1] || valueMatch?.[1] || pathVarMatch?.[1] || '';
                    
                    // Find method name
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
                        this.endpoints.push({
                            path: this.combinePath(this.contextPath, baseUrl, methodPath),
                            className: currentClass,
                            methodName: methodName,
                            filePath: filePath,
                            lineNumber: i + 1,
                            language: 'java'
                        });
                    }
                }
            }
        }
    }

    private combinePath(...parts: string[]): string {
        // Special handling: if RequestMapping is just "/", ignore it
        const validParts = parts.filter(part => {
            if (part === '/') {
                return false;  // Ignore single slashes
            }
            return Boolean(part);  // Keep non-empty values
        });
        
        // Ensure each part does not start or end with a slash
        const cleanParts = validParts.map(part => 
            part.replace(/^\/+|\/+$/g, '')
        );
        
        // Combine paths
        return '/' + cleanParts.join('/');
    }

    public async getEndpoints(): Promise<ApiEndpoint[]> {
        const now = Date.now();
        if (now - this.lastScanTime > this.CACHE_TIMEOUT) {
            await this.scanWorkspace();
            this.lastScanTime = now;
        }
        return this.endpoints;
    }

    public searchEndpoints(query: string): ApiEndpoint[] {
        const lowerQuery = query.toLowerCase();
        return this.endpoints.filter(endpoint => 
            endpoint.path.toLowerCase().includes(lowerQuery) ||
            endpoint.className.toLowerCase().includes(lowerQuery) ||
            endpoint.methodName.toLowerCase().includes(lowerQuery)
        );
    }

    private async readFileContent(filePath: string): Promise<string> {
        const cached = this.fileContentCache.get(filePath);
        if (cached) {
            return cached;
        }

        const content = await fs.promises.readFile(filePath, 'utf8');
        
        // Cache management
        if (this.fileContentCache.size >= this.MAX_CACHE_SIZE) {
            // Get the first key, ensure it's a string type
            const firstKey = Array.from(this.fileContentCache.keys())[0];
            if (firstKey) {
                this.fileContentCache.delete(firstKey);
            }
        }
        
        this.fileContentCache.set(filePath, content);
        return content;
    }
} 