import * as vscode from 'vscode';
import { EndpointQuickPick } from './quickPick/EndpointQuickPick';
import { ApiEndpointProvider } from './providers/ApiEndpointProvider';

export function activate(context: vscode.ExtensionContext) {
    try {
        const provider = ApiEndpointProvider.getInstance();
        
        // Create status bar button
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            1000
        );
        statusBarItem.text = "$(search) Search API";
        statusBarItem.tooltip = "Search API Endpoints (Default: Ctrl+Shift+A)";
        statusBarItem.command = 'apiEndpointFinder.searchEndpoints';
        statusBarItem.show();

        // Listen for workspace changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders(() => {
                // Also show when workspace changes
                statusBarItem.show();
            })
        );
        
        // Initial scan
        provider.scanWorkspace().catch(err => {
            console.error('Scan workspace failed:', err);
            throw err;
        });
        
        // Listen for file changes
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.java');
        fileWatcher.onDidChange(() => provider.scanWorkspace());
        fileWatcher.onDidCreate(() => provider.scanWorkspace());
        fileWatcher.onDidDelete(() => provider.scanWorkspace());
        // Register command
        const disposable = vscode.commands.registerCommand('apiEndpointFinder.searchEndpoints', async () => {
            try {
                const quickPick = new EndpointQuickPick();
                await quickPick.show();
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to search API endpoints: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        });

        // Add to subscription list
        context.subscriptions.push(disposable);
        context.subscriptions.push(statusBarItem);
        context.subscriptions.push(fileWatcher);

        // Show settings guide message
        const configureAction = 'Configure Shortcut';
        vscode.window.showInformationMessage(
            'API Navigator is ready! Default shortcut is Ctrl+Shift+A (Cmd+Shift+A on Mac). Click to customize.',
            configureAction
        ).then(selection => {
            if (selection === configureAction) {
                vscode.commands.executeCommand(
                    'workbench.action.openGlobalKeybindings',
                    'API Navigator'
                );
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage('API Navigator failed to activate');
        throw error;
    }
}
