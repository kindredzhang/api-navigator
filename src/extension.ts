import * as vscode from 'vscode';
import { ApiEndpointProvider } from './providers/ApiEndpointProvider';
import { EndpointQuickPick } from './quickPick/EndpointQuickPick';
import { beforeActiveCheck } from './utils/check';

export async function activate(context: vscode.ExtensionContext) {
    try {
        // 检查项目类型，如果不支持则直接返回
        const projectType = await beforeActiveCheck();
        if (!projectType || projectType === 'unknown') {
            return;
        }

        // 初始化 provider 和状态栏
        const provider = ApiEndpointProvider.getInstance();
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            1000
        );
        statusBarItem.text = "$(search) Search API";
        statusBarItem.tooltip = "Search API Endpoints";
        statusBarItem.command = 'apiEndpointFinder.searchEndpoints';
        statusBarItem.show();

        // 监听工作区变化
        const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders) {
                statusBarItem.hide();
                return;
            }

            // 重新检查项目类型
            const newProjectType = await beforeActiveCheck();
            if (newProjectType && newProjectType !== 'unknown') {
                statusBarItem.show();
                await provider.scanWorkspace();
            } else {
                statusBarItem.hide();
            }
        });

        // 初始扫描
        await provider.scanWorkspace();
        
        // 文件监听器 - 根据项目类型设置监听的文件类型
        const filePattern = getFilePattern(projectType);
        const fileWatcher = vscode.workspace.createFileSystemWatcher(filePattern);
        fileWatcher.onDidChange(() => provider.scanWorkspace());
        fileWatcher.onDidCreate(() => provider.scanWorkspace());
        fileWatcher.onDidDelete(() => provider.scanWorkspace());

        // 注册命令
        const searchCommand = vscode.commands.registerCommand('apiEndpointFinder.searchEndpoints', async () => {
            try {
                const quickPick = new EndpointQuickPick();
                await quickPick.show();
            } catch (error) {
                console.error('Error in search command:', error);
            }
        });

        // 注册所有订阅
        context.subscriptions.push(
            statusBarItem,
            fileWatcher,
            workspaceChangeListener,
            searchCommand
        );

        // 首次激活提示
        const hasShownGuide = context.globalState.get('apiNavigator.hasShownGuide');
        if (!hasShownGuide) {
            vscode.window.showInformationMessage(
                'API Navigator activated. Use Ctrl+Shift+A (Cmd+Shift+A on Mac) to search APIs.'
            );
            await context.globalState.update('apiNavigator.hasShownGuide', true);
        }

    } catch (error) {
        console.error('API Navigator activation error:', error);
    }
}

// 根据项目类型返回相应的文件监听模式
function getFilePattern(projectType: string): string {
    switch (projectType) {
        case 'springBoot':
            return '**/*.java';
        case 'express':
        case 'nest':
            return '**/*.{js,ts}';
        case 'gin':
        case 'echo':
            return '**/*.go';
        default:
            return '**/*.{java,ts,js,go}';
    }
}