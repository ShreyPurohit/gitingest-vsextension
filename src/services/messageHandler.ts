import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';
import { AnalysisResultData, WebviewMessage } from '../types';
import { normalizeIngestOptions } from '../utils/ingestOptions';
import { togglePattern } from '../utils/patternToggle';
import { processManager } from '../utils/processManager';
import { AnalysisService } from './analysisService';
import { WebviewService } from './webviewService';
import { WorkspaceService } from './workspaceService';

export async function handleWebviewMessage(
    message: WebviewMessage,
    panel: vscode.WebviewPanel,
): Promise<void> {
    try {
        switch (message.command) {
            case 'analyze':
                await handleAnalyzeCommand(panel);
                break;
            case 'cancel':
                await handleCancelCommand(panel);
                break;
            case 'copy':
                await handleCopyCommand(panel, message);
                break;
            case 'saveToFile':
                await handleSaveToFile(panel);
                break;
            case 'openInEditor':
                await handleOpenInEditor(panel);
                break;
            case 'toggleFilter':
                handleToggleFilter(panel, message);
                break;
            case 'retry':
                await handleAnalyzeCommand(panel);
                break;
            case 'reIngest':
                await handleReIngestCommand(panel, message);
                break;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
        vscode.window.showErrorMessage(`Command failed: ${errorMessage}`);
    }
}

async function handleAnalyzeCommand(panel: vscode.WebviewPanel): Promise<void> {
    await processManager.killCurrentProcess();
    const workspaceFolder = WorkspaceService.getWorkspaceFolder();
    if (!workspaceFolder) {
        throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
    }

    try {
        await AnalysisService.verifyDependencies(panel);
        await AnalysisService.analyze(panel, workspaceFolder.uri.fsPath, 'Analyzing repository...');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Analysis Failed', [errorMessage]);
    }
}

async function handleCancelCommand(panel: vscode.WebviewPanel): Promise<void> {
    await processManager.killCurrentProcess();
    panel.dispose();
    vscode.window.showInformationMessage('Analysis cancelled');
}

async function handleCopyCommand(
    panel: vscode.WebviewPanel,
    message: WebviewMessage,
): Promise<void> {
    const text = message.section ? sectionText(panel, message.section) : message.text;
    if (text) {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage('Analysis output copied to clipboard!');
    }
}

/**
 * Read a part of the digest from the panel's state. The webview holds only the
 * rendered markup, so copy, save and open never ship the text back and forth.
 */
function sectionText(
    panel: vscode.WebviewPanel,
    section: NonNullable<WebviewMessage['section']>,
): string | undefined {
    const data = WebviewService.getPanelState(panel)?.data;
    if (!data) {
        return undefined;
    }

    switch (section) {
        case 'summary':
            return data.summary;
        case 'tree':
            return data.tree;
        case 'content':
            return data.content;
        case 'all':
            return [data.summary, data.tree, data.content].join('\n\n');
    }
}

/** Toggle a clicked tree entry in whichever list the panel is editing. */
function handleToggleFilter(panel: vscode.WebviewPanel, message: WebviewMessage): void {
    const pattern = typeof message.pattern === 'string' ? message.pattern : '';
    const mode = message.mode === 'include' ? 'include' : 'exclude';
    if (!pattern) {
        return;
    }

    const current = normalizeIngestOptions(message.options);
    WebviewService.updatePanelFilters(panel, togglePattern(current, pattern, mode));
}

function digest(panel: vscode.WebviewPanel): AnalysisResultData {
    const data = WebviewService.getPanelState(panel)?.data;
    if (!data) {
        throw new Error('No analysis result is available in this panel.');
    }
    return data;
}

async function handleReIngestCommand(
    panel: vscode.WebviewPanel,
    message: WebviewMessage,
): Promise<void> {
    const unavailableReason =
        WebviewService.getPanelState(panel)?.filters.reIngestUnavailableReason;
    if (unavailableReason) {
        vscode.window.showWarningMessage(unavailableReason);
        return;
    }

    const pathTrimmed = typeof message.path === 'string' ? message.path.trim() : '';
    if (!pathTrimmed) {
        WebviewService.showError(panel, 'Re-Ingest Failed', [
            'No folder path provided. Close and run Analyze or Analyze This Folder again.',
        ]);
        return;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pathTrimmed));
    if (!workspaceFolder) {
        WebviewService.showError(panel, 'Re-Ingest Failed', [
            'Folder is not in the workspace or no longer exists.',
        ]);
        return;
    }
    await processManager.killCurrentProcess();
    try {
        await AnalysisService.verifyDependencies(panel);
        await AnalysisService.analyze(
            panel,
            pathTrimmed,
            'Re-analyzing folder...',
            message.options,
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Re-Ingest Failed', [errorMessage]);
    }
}

async function handleOpenInEditor(panel: vscode.WebviewPanel): Promise<void> {
    await WorkspaceService.openResultsInEditor(digest(panel));
}

async function handleSaveToFile(panel: vscode.WebviewPanel): Promise<void> {
    const workspaceFolder = WorkspaceService.getWorkspaceFolder();
    if (!workspaceFolder) {
        throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
    }

    await WorkspaceService.saveResultsToFile(digest(panel));
}
