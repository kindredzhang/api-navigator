import * as vscode from 'vscode';
import { ApiEndpoint, HttpMethod, ScannerConfig } from "../../core/types";
import { BaseScanner } from "../base/BaseScanner";
import { FileUtils } from '../../utils/fileSystem';

export class ExpressScanner extends BaseScanner {
    constructor(config: ScannerConfig) {
        super(config);
    }

    public async scan(folderPath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folderPath, '**/*.{js,ts}')
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
        return content.includes('express') &&
            (content.includes('Router') || content.includes('app.') || content.includes('router.'));
    }

    public async parseFile(content: string, filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');
        let currentRouter = '';
        let baseRoute = '';
        let appVarName = 'app';
        let routerVarName = 'router';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.includes('express()')) {
                const match = line.match(/(\w+)\s*=\s*express\(\)/);
                if (match) {
                    appVarName = match[1];
                }
            }

            if (line.includes('express.Router()') || line.includes('Router()')) {
                const match = line.match(/(\w+)\s*=\s*(?:express\.)?Router\(\)/);
                if (match) {
                    routerVarName = match[1];
                }
            }

            if (line.includes('.use(')) {
                const routeMatch = line.match(/use\(['"](.*?)['"],\s*\w+/);
                if (routeMatch) {
                    baseRoute = routeMatch[1];
                }
            }

            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'all'];
            for (const method of httpMethods) {
                const patterns = [
                    // app.get('/path', handler)
                    new RegExp(`${appVarName}\\.${method}\\(['"]([^'"]+)['"]`),
                    // router.get('/path', handler)
                    new RegExp(`${routerVarName}\\.${method}\\(['"]([^'"]+)['"]`),
                    // app.route('/path').get(handler)
                    new RegExp(`route\\(['"]([^'"]+)['"]\\).*?\\.${method}\\(`),
                ];

                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match) {
                        const path = match[1];
                        
                        // Extract handler function name
                        let handlerName = 'unknown';
                        const handlerMatch = line.match(/,\s*(\w+)(?:\)|\s*,)/);
                        if (handlerMatch) {
                            handlerName = handlerMatch[1];
                        }

                        // Try to get controller class name (if using class-based organization)
                        let className = '';
                        for (let j = i; j >= 0; j--) {
                            const classMatch = lines[j].match(/class\s+(\w+)/);
                            if (classMatch) {
                                className = classMatch[1];
                                break;
                            }
                        }

                        endpoints.push({
                            apiPath: this.combinePath(baseRoute, path),
                            className: className || 'default',
                            methodName: handlerName,
                            filePath: filePath,
                            lineNumber: i + 1,
                            language: filePath.endsWith('.ts') ? 'typescript' : 'javascript',
                            httpMethod: method.toUpperCase() as HttpMethod
                        });
                    }
                }
            }

            // Handle chained route definition
            if (line.includes('route(')) {
                currentRouter = line;
            } else if (currentRouter && httpMethods.some(method => line.includes(`.${method}(`))) {
                const routeMatch = currentRouter.match(/route\(['"]([^'"]+)['"]\)/);
                if (routeMatch) {
                    const path = routeMatch[1];
                    const methodMatch = line.match(/\.(\w+)\(/);
                    if (methodMatch) {
                        const method = methodMatch[1];
                        endpoints.push({
                            apiPath: this.combinePath(baseRoute, path),
                            className: 'default',
                            methodName: 'chainedHandler',
                            filePath: filePath,
                            lineNumber: i + 1,
                            language: filePath.endsWith('.ts') ? 'typescript' : 'javascript',
                            httpMethod: method.toUpperCase() as HttpMethod
                        });
                    }
                }
            } else {
                currentRouter = '';
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
