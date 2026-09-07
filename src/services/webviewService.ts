import * as vscode from 'vscode';
import { WEBVIEW_OPTIONS } from '../config';
import { AnalysisResultData, IngestOptions, ResultFilters, StatusMessage } from '../types';
import { handleWebviewMessage } from './messageHandler';
import { getErrorContent, getLoadingContent, getResultsContent } from '../webview';

/** What a results panel is currently showing, so the panel itself carries no digest. */
interface PanelState {
    data: AnalysisResultData;
    ingestedPath: string;
    filters: ResultFilters;
}

const panelState = new WeakMap<vscode.WebviewPanel, PanelState>();

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

    public static showResults(
        panel: vscode.WebviewPanel,
        data: AnalysisResultData,
        ingestedPath?: string,
        filters?: ResultFilters,
    ): void {
        if (ingestedPath && filters) {
            panelState.set(panel, { data, ingestedPath, filters });
        } else {
            panelState.delete(panel);
        }
        panel.webview.html = getResultsContent(data, ingestedPath, filters);
    }

    public static getPanelState(panel: vscode.WebviewPanel): PanelState | undefined {
        return panelState.get(panel);
    }

    /** Push new filter values into an open panel without re-rendering it. */
    public static updatePanelFilters(
        panel: vscode.WebviewPanel,
        applied: IngestOptions,
    ): Thenable<boolean> | undefined {
        const state = panelState.get(panel);
        if (!state) {
            return undefined;
        }
        state.filters = { ...state.filters, applied };
        return panel.webview.postMessage({ type: 'filtersUpdated', options: applied });
    }
}
