import * as vscode from 'vscode';
import { WEBVIEW_OPTIONS } from '../config';
import { StatusMessage } from '../types';
import { handleWebviewMessage } from './messageHandler';
import { getErrorContent, getLoadingContent, getResultsContent } from '../webview';

export class WebviewService {
    public static createAnalysisPanel(title: string = 'GitIngest Analysis'): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'gitingestResults',
            title,
            vscode.ViewColumn.One,
            WEBVIEW_OPTIONS,
        );
        // Ensure webview message handling is always wired up
        this.setupMessageHandler(panel);
        return panel;
    }

    public static setupMessageHandler(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            (message) => handleWebviewMessage(message, panel),
            undefined,
            [],
        );
    }

    public static updateLoadingStatus(panel: vscode.WebviewPanel, messages: StatusMessage[]): void {
        panel.webview.html = getLoadingContent(messages);
    }

    public static showError(panel: vscode.WebviewPanel, title: string, errors: string[]): void {
        panel.webview.html = getErrorContent(title, errors);
    }

    public static showResults(panel: vscode.WebviewPanel, data: any): void {
        panel.webview.html = getResultsContent(data);
    }
}
