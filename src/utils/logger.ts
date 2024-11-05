import * as vscode from 'vscode';

export class Logger {
    private static output: vscode.OutputChannel;

    static init() {
        this.output = vscode.window.createOutputChannel('API Navigator');
    }

    static log(message: string) {
        this.output.appendLine(`[${new Date().toISOString()}] ${message}`);
    }

    static error(error: Error) {
        this.output.appendLine(`[ERROR] ${error.message}\n${error.stack}`);
        vscode.window.showErrorMessage(`API Navigator: ${error.message}`);
    }
} 