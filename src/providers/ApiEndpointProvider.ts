import * as vscode from 'vscode';
import { ApiEndpoint, ProjectType, Scanner } from '../core/types';
import { SpringBootScanner } from '../scanners/java/SpringBootScanner';
import { checkProjectType } from '../utils/check';
import { GinScanner } from '../scanners/golang/GinScanner';
import { EchoScanner } from '../scanners/golang/EchoScanner';
import { ExpressScanner } from '../scanners/node/ExpressScanner';
import { NestScanner } from '../scanners/node/NestScanner';
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
        // java springBoot
        this.scanners.set('springBoot', new SpringBootScanner({
            fileExtensions: ['java'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**'],
        }));
        // golang gin
        this.scanners.set('gin', new GinScanner({
            fileExtensions: ['go'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**'],
        }));
        // golang echo
        this.scanners.set('echo', new EchoScanner({
            fileExtensions: ['go'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**'],
        }));
        // node express
        this.scanners.set('express', new ExpressScanner({
            fileExtensions: ['js', 'ts'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**'],
        }));
        // node nest
        this.scanners.set('nest', new NestScanner({
            fileExtensions: ['ts'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**'],
        }));
        // python fastapi
        this.scanners.set('fastapi', new FastAPIScanner({
            fileExtensions: ['py'],
            excludePatterns: ['**/test/**', '**/tests/**', '**/Tests/**', '**/__pycache__/**', '**/venv/**'],
        }));
        // Initialize other scanners...
    }

    public async scanWorkspace(): Promise<void> {
        if (this.isScanning) {
            return;
        }

        try {
            console.log('Starting workspace scan...');
            this.isScanning = true;
            this.endpoints = [];
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            if (!workspaceFolders) {
                console.log('No workspace folders found');
                return;
            }

            console.log('Found workspace folders:', workspaceFolders.map(f => f.uri.fsPath));
            const scanPromises = workspaceFolders.map(async folder => {
                try {
                    console.log('Detecting project type for folder:', folder.uri.fsPath);
                    const projectType = await this.detectProjectType(folder.uri.fsPath);
                    console.log('Detected project type:', projectType);
                    const scanner = this.scanners.get(projectType);
                    
                    if (scanner) {
                        console.log('Using scanner for type:', projectType);
                        const newEndpoints = await scanner.scan(folder.uri.fsPath);
                        console.log('Found endpoints:', newEndpoints.length);
                        this.endpoints.push(...newEndpoints);
                    } else {
                        console.log('No scanner found for project type:', projectType);
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