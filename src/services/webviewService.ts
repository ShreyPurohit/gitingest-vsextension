import * as vscode from 'vscode';
import { WEBVIEW_OPTIONS } from '../config';
import { StatusMessage, WebviewMessage } from '../types';
import { getErrorContent, getLoadingContent, getResultsContent, getSetupGuideContent } from '../webview/templates';
import { handleWebviewMessage } from './messageHandler';

export class WebviewService {
    public static createSetupPanel(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'gitingestSetup',
            'GitIngest Setup Guide',
            vscode.ViewColumn.One,
            WEBVIEW_OPTIONS
        );

        panel.webview.html = getSetupGuideContent();
        return panel;
    }

    public static createAnalysisPanel(title: string = 'GitIngest Analysis'): vscode.WebviewPanel {
        return vscode.window.createWebviewPanel(
            'gitingestResults',
            title,
            vscode.ViewColumn.One,
            WEBVIEW_OPTIONS
        );
    }

    public static setupMessageHandler(panel: vscode.WebviewPanel): void {
        panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => handleWebviewMessage(message, panel),
            undefined,
            []
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