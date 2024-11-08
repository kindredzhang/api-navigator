import * as vscode from 'vscode';
import { ApiEndpoint, ProjectType, Scanner } from '../core/types';
import { SpringBootScanner } from '../scanners/java/SpringBootScanner';
import { checkProjectType } from '../utils/check';
// Import other scanners...

export class ApiEndpointProvider {
    private static instance: ApiEndpointProvider;
    private endpoints: ApiEndpoint[] = [];
    private scanners: Map<ProjectType, Scanner> = new Map();
    private isScanning: boolean = false;

    private constructor() {
        this.initializeScanners();
    }

    public static getInstance(): ApiEndpointProvider {
        if (!ApiEndpointProvider.instance) {
            ApiEndpointProvider.instance = new ApiEndpointProvider();
        }
        return ApiEndpointProvider.instance;
    }

    private initializeScanners() {
        this.scanners.set('springBoot', new SpringBootScanner({
            fileExtensions: ['java'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**'],
        }));
        // Initialize other scanners...
    }

    public async scanWorkspace(): Promise<void> {
        if (this.isScanning) {
            return;
        }

        try {
            this.isScanning = true;
            this.endpoints = [];
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            if (!workspaceFolders) {
                return;
            }

            const scanPromises = workspaceFolders.map(async folder => {
                try {
                    const projectType = await this.detectProjectType(folder.uri.fsPath);
                    const scanner = this.scanners.get(projectType);
                    
                    if (scanner) {
                        const newEndpoints = await scanner.scan(folder.uri.fsPath);
                        this.endpoints.push(...newEndpoints);
                    }
                } catch (error) {
                    console.error(`Error scanning folder ${folder.uri.fsPath}:`, error);
                }
            });

            await Promise.all(scanPromises);
        } catch (error) {
            console.error('Error in scanWorkspace:', error);
            throw error;
        } finally {
            this.isScanning = false;
        }
    }

    public searchEndpoints(query: string): ApiEndpoint[] {
        const lowerQuery = query.toLowerCase();
        return this.endpoints.filter(endpoint => 
            endpoint.apiPath.toLowerCase().includes(lowerQuery) ||
            endpoint.className.toLowerCase().includes(lowerQuery) ||
            endpoint.methodName.toLowerCase().includes(lowerQuery)
        );
    }

    private async detectProjectType(folderPath: string): Promise<ProjectType> {
        try {
            return await checkProjectType(folderPath) as ProjectType;
        } catch (error) {
            console.error('Error detecting project type:', error);
            return 'unknown';
        }
    }
} 