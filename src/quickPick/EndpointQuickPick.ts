import * as vscode from 'vscode';
import { ApiEndpoint } from '../models/ApiEndpoint';
import { ApiEndpointProvider } from '../providers/ApiEndpointProvider';
import { debounce } from '../utils/debounce';

interface EndpointQuickPickItem extends vscode.QuickPickItem {
    endpoint: ApiEndpoint;
}

export class EndpointQuickPick {
    private quickPick: vscode.QuickPick<EndpointQuickPickItem>;
    private provider: ApiEndpointProvider;
    private readonly debouncedSearch: (value: string) => void;

    constructor() {
        this.quickPick = vscode.window.createQuickPick();
        this.provider = ApiEndpointProvider.getInstance();
        
        this.quickPick.placeholder = 'Search API endpoints (e.g., /users or UserController)';
        this.quickPick.matchOnDescription = true;
        this.quickPick.matchOnDetail = true;

        this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
        
        this.quickPick.onDidChangeValue(value => this.debouncedSearch(value));
        this.quickPick.onDidAccept(this.onDidAccept.bind(this));
        this.quickPick.onDidHide(() => {
            this.quickPick.dispose();
        });
    }

    private async performSearch(value: string) {
        if (!value) {
            this.quickPick.items = [];
            return;
        }

        const endpoints = await this.provider.searchEndpoints(value);
        this.quickPick.items = this.formatEndpoints(endpoints);
    }

    private formatEndpoints(endpoints: ApiEndpoint[]): EndpointQuickPickItem[] {
        return endpoints.map(endpoint => ({
            label: `$(link) ${endpoint.path}`,
            description: `$(symbol-class) ${endpoint.className}.${endpoint.methodName}`,
            detail: `$(file-code) ${vscode.workspace.asRelativePath(endpoint.filePath)}:${endpoint.lineNumber}`,
            endpoint: endpoint
        }));
    }

    private async onDidAccept() {
        const selected = this.quickPick.selectedItems[0] as EndpointQuickPickItem;
        if (selected?.endpoint) {
            const endpoint = selected.endpoint;
            const document = await vscode.workspace.openTextDocument(endpoint.filePath);
            const editor = await vscode.window.showTextDocument(document);
            
            const position = new vscode.Position(endpoint.lineNumber, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        this.quickPick.hide();
    }

    private onDidTriggerButton(button: vscode.QuickInputButton) {
        if (button === this.quickPick.buttons[0]) {
            this.quickPick.value = '@GetMapping ';
        } else {
            this.quickPick.value = 'Controller ';
        }
    }

    public async show() {
        await this.provider.scanWorkspace();
        this.quickPick.show();
    }
} 