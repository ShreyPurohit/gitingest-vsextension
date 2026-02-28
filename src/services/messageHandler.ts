import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';
import { WebviewMessage } from '../types';
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
                await handleCopyCommand(message.text);
                break;
            case 'saveToFile':
                await handleSaveToFile(message);
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

async function handleCopyCommand(text?: string): Promise<void> {
    if (text) {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage('Analysis output copied to clipboard!');
    }
}

async function handleReIngestCommand(
    panel: vscode.WebviewPanel,
    message: WebviewMessage,
): Promise<void> {
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
        await AnalysisService.analyze(panel, pathTrimmed, 'Re-analyzing folder...');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Re-Ingest Failed', [errorMessage]);
    }
}

async function handleSaveToFile(message: WebviewMessage): Promise<void> {
    const workspaceFolder = WorkspaceService.getWorkspaceFolder();
    if (!workspaceFolder) {
        throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
    }

    try {
        if (!message.data) {
            throw new Error('No data provided to save');
        }
        await WorkspaceService.saveResultsToFile(message.data);
    } catch (error) {
        throw new Error('Failed to save analysis to file');
    }
}
