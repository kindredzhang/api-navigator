import * as fs from 'fs';
import * as vscode from 'vscode';
import { BUILD_FILES } from '../constants';
// check project type project's language and framework
export async function checkProjectType(folderPath: string): Promise<string> {
    try {
        console.log('Scanning project at:', folderPath);

        // Check for Spring Boot (Maven)
        const pomFiles = await vscode.workspace.findFiles('**/pom.xml');
        if (pomFiles.length > 0) {
            const content = await fs.promises.readFile(pomFiles[0].fsPath, 'utf8');
            if (content.includes('springBoot-starter-web')) {
                return 'springBoot';
            }
        }

        // Check for Spring Boot (Gradle)
        const gradleFiles = await vscode.workspace.findFiles('**/build.gradle');
        const gradleKtsFiles = await vscode.workspace.findFiles('**/build.gradle.kts');
        if (gradleFiles.length > 0 || gradleKtsFiles.length > 0) {
            const gradleFile = gradleFiles.length > 0 ? gradleFiles[0] : gradleKtsFiles[0];
            const content = await fs.promises.readFile(gradleFile.fsPath, 'utf8');
            if (content.includes('springBoot-starter-web')) {
                return 'springBoot';
            }
        }

        // Check for Express.js
        const packageFiles = await vscode.workspace.findFiles('**/package.json');
        if (packageFiles.length > 0) {
            const content = await fs.promises.readFile(packageFiles[0].fsPath, 'utf8');
            const packageJson = JSON.parse(content);
            if (packageJson.dependencies?.['express']) {
                return 'express';
            }
            if (packageJson.dependencies?.['@nestjs/core']) {
                return 'nest';
            }
        }

        // Check for Gin/Echo framework
        const goModFiles = await vscode.workspace.findFiles('**/go.mod');
        if (goModFiles.length > 0) {
            const content = await fs.promises.readFile(goModFiles[0].fsPath, 'utf8');
            if (content.includes('github.com/gin-gonic/gin')) {
                return 'gin';
            }
            if (content.includes('github.com/labstack/echo')) {
                return 'echo';
            }
        }

    } catch (error) {
        console.error('Error detecting project type:', error);
    }
    return 'unknown';
}

async function hasBuildFiles(folderPath: string): Promise<boolean> {
    try {
        const rootFiles = await fs.promises.readdir(folderPath);
        return Object.values(BUILD_FILES).some(buildFile => 
            rootFiles.includes(buildFile)
        );
    } catch (error) {
        console.error('Error checking build files:', error);
        return false;
    }
}

export async function beforeActiveCheck() {
    // check workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }
    // check has project build files
    const isProject = await hasBuildFiles(workspaceFolders[0].uri.fsPath);
    if (!isProject) {
        return;
    }
    // check project type
    const projectType = await checkProjectType(workspaceFolders[0].uri.fsPath);
    return projectType;
}