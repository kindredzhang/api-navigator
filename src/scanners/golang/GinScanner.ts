import * as vscode from 'vscode';
import { ApiEndpoint, HttpMethod, ScannerConfig } from "../../core/types";
import { BaseScanner } from "../base/BaseScanner";
import { FileUtils } from '../../utils/fileSystem';

export class GinScanner extends BaseScanner {
    constructor(config: ScannerConfig) {
        super(config);
    }

    public async scan(folderPath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folderPath, '**/*.go')
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
        return content.includes('github.com/gin-gonic/gin') &&
            (content.includes('gin.Engine') || 
             content.includes('gin.RouterGroup') || 
             content.includes('gin.Context'));
    }

    public async parseFile(content: string, filePath: string): Promise<ApiEndpoint[]> {
        const endpoints: ApiEndpoint[] = [];
        const lines = content.split('\n');
        let currentGroup = '';
        let routerVarName = 'r';
        let currentStruct = '';
        let inGroup = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检查结构体定义
            const structMatch = line.match(/type\s+(\w+)\s+struct/);
            if (structMatch) {
                currentStruct = structMatch[1];
                continue;
            }

            // 检查 gin 实例定义
            if (line.includes('gin.Default()') || line.includes('gin.New()')) {
                const match = line.match(/(\w+)\s*:?=\s*gin\.(Default|New)\(\)/);
                if (match) {
                    routerVarName = match[1];
                }
                continue;
            }

            // 检查路由组定义
            if (line.includes('.Group(')) {
                const groupMatch = line.match(/[.]Group\(['"]([^'"]+)['"]/);
                if (groupMatch) {
                    currentGroup = groupMatch[1];
                    inGroup = true;
                }
                continue;
            }

            // 检查路由组结束
            if (inGroup && line.includes('}')) {
                inGroup = false;
                currentGroup = '';
                continue;
            }

            // 检查路由定义
            const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
            for (const method of httpMethods) {
                // 支持多种路由定义模式
                const patterns = [
                    // 标准路由: r.GET("/path", handler)
                    new RegExp(`\\.(${method})\\(['"]([^'"]+)['"]`),
                    // 组路由: group.GET("/path", handler)
                    new RegExp(`group\\.(${method})\\(['"]([^'"]+)['"]`),
                    // 变量路由: router.GET("/path", handler)
                    new RegExp(`${routerVarName}\\.(${method})\\(['"]([^'"]+)['"]`)
                ];

                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match) {
                        const path = match[2];
                        
                        // 提取处理函数名
                        let handlerName = 'unknown';
                        const handlerMatch = line.match(/,\s*([\w.]+)(?:\)|\s*,)/);
                        if (handlerMatch) {
                            handlerName = handlerMatch[1];
                        }

                        // 处理结构体方法
                        const methodMatch = handlerName.match(/(\w+)\.(\w+)/);
                        if (methodMatch) {
                            currentStruct = methodMatch[1];
                            handlerName = methodMatch[2];
                        }

                        endpoints.push({
                            apiPath: this.combinePath(currentGroup, path),
                            className: currentStruct || 'main',
                            methodName: handlerName,
                            filePath: filePath,
                            lineNumber: i + 1,
                            language: 'go',
                            httpMethod: method as HttpMethod
                        });
                    }
                }
            }
        }

        return endpoints;
    }

    private combinePath(...parts: string[]): string {
        const validParts = parts.filter(part => {
            if (part === '/') return false;
            return Boolean(part);
        });
        
        const cleanParts = validParts.map(part => 
            part.replace(/^\/+|\/+$/g, '')
        );
        
        return '/' + cleanParts.join('/');
    }
}