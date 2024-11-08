import * as vscode from 'vscode';
import { ApiEndpointProvider } from './providers/ApiEndpointProvider';
import { EndpointQuickPick } from './quickPick/EndpointQuickPick';
import { beforeActiveCheck } from './utils/check';

export async function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Registering apiEndpointFinder.searchEndpoints command...');
        const searchCommand = vscode.commands.registerCommand('apiEndpointFinder.searchEndpoints', async () => {
            console.log('Search command triggered');
            try {
                const quickPick = new EndpointQuickPick();
                await quickPick.show();
            } catch (error) {
                console.error('Error in search command:', error);
                vscode.window.showErrorMessage('Failed to open API search: ' + error);
            }
        });
        console.log('Command registered successfully');

        // 初始化 provider 和状态栏
        const provider = ApiEndpointProvider.getInstance();
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            1000
        );
        statusBarItem.text = "$(search) Search API";
        statusBarItem.tooltip = "Search API Endpoints";
        statusBarItem.command = 'apiEndpointFinder.searchEndpoints';

        // 检查项目类型
        const projectType = await beforeActiveCheck();
        if (projectType && projectType !== 'unknown') {
            statusBarItem.show();
            await provider.scanWorkspace();
        } else {
            statusBarItem.hide();
        }

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

        // 只在项目类型正确时设置文件监听器
        let fileWatcher: vscode.FileSystemWatcher | undefined;
        if (projectType && projectType !== 'unknown') {
            const filePattern = getFilePattern(projectType);
            fileWatcher = vscode.workspace.createFileSystemWatcher(filePattern);
            fileWatcher.onDidChange(() => provider.scanWorkspace());
            fileWatcher.onDidCreate(() => provider.scanWorkspace());
            fileWatcher.onDidDelete(() => provider.scanWorkspace());
        }

        // 注册所有订阅
        context.subscriptions.push(
            searchCommand,
            statusBarItem,
            workspaceChangeListener
        );

        if (fileWatcher) {
            context.subscriptions.push(fileWatcher);
        }

        // 首次激活提示
        const hasShownGuide = context.globalState.get('apiNavigator.hasShownGuide');
        if (!hasShownGuide) {
            vscode.window.showInformationMessage(
                'API Navigator activated. Use Ctrl+Shift+A (Cmd+Shift+A on Mac) to search APIs.'
            );
            await context.globalState.update('apiNavigator.hasShownGuide', true);
        }

    } catch (error) {
        console.error('Activation error:', error);
        vscode.window.showErrorMessage('Failed to activate API Navigator: ' + error);
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