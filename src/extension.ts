import * as path from 'path';
import * as vscode from 'vscode';
import { COMMANDS } from './config';
import { AnalysisService } from './services/analysisService';
import { WebviewService } from './services/webviewService';
import { WorkspaceService } from './services/workspaceService';
import { processManager } from './utils/processManager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    AnalysisService.setScriptPath(context);
    AnalysisService.setContext(context);
    WorkspaceService.setContext(context);

    const commands = registerCommands(context);

    context.subscriptions.push(...commands);
}

function registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
        vscode.commands.registerCommand(COMMANDS.analyze, handleAnalyze),
        vscode.commands.registerCommand(COMMANDS.analyzeFolder, handleAnalyzeFolder),
        vscode.commands.registerCommand(COMMANDS.addToIngest, handleAddToIngest),
        vscode.commands.registerCommand(COMMANDS.reIngest, () => handleReIngest(context)),
    ];
}

async function handleAnalyze(panel?: vscode.WebviewPanel): Promise<void> {
    if (!panel) {
        panel = WebviewService.createAnalysisPanel();
    }

    panel.onDidDispose(() => {
        processManager.killCurrentProcess().catch(console.error);
    });

    try {
        await AnalysisService.verifyDependencies(panel);
        const workspaceFolder = WorkspaceService.getWorkspaceFolder();

        if (!workspaceFolder) {
            throw new Error('No workspace folder is open');
        }

        await AnalysisService.analyze(panel, workspaceFolder.uri.fsPath, 'Analyzing repository...');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Analysis Failed', [errorMessage]);
    }
}

async function handleAnalyzeFolder(folderUri: vscode.Uri): Promise<void> {
    if (!folderUri) {
        vscode.window.showErrorMessage('Invalid folder selected');
        return;
    }

    const folderName = path.basename(folderUri.fsPath);
    const panel = WebviewService.createAnalysisPanel(`GitIngest: ${folderName}`);

    panel.onDidDispose(() => {
        processManager.killCurrentProcess().catch(console.error);
    });

    try {
        await AnalysisService.verifyDependencies(panel);
        await AnalysisService.analyze(
            panel,
            folderUri.fsPath,
            `Analyzing folder: ${folderName}...`,
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Analysis Failed', [errorMessage]);
    }
}

async function handleAddToIngest(resourceUri: vscode.Uri): Promise<void> {
    if (!resourceUri) {
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
    }

    try {
        await WorkspaceService.addToIngest(resourceUri);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Failed to add the selected item to ingest.';
        vscode.window.showErrorMessage(message);
    }
}

async function handleReIngest(context: vscode.ExtensionContext): Promise<void> {
    const lastPath = context.workspaceState.get<string>('gitingest.lastIngestedPath');
    if (!lastPath || typeof lastPath !== 'string' || lastPath.trim() === '') {
        vscode.window.showInformationMessage(
            "No previous folder to re-ingest. Use 'Analyze' or 'Analyze This Folder' first.",
        );
        return;
    }
    const pathTrimmed = lastPath.trim();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pathTrimmed));
    if (!workspaceFolder) {
        context.workspaceState.update('gitingest.lastIngestedPath', undefined);
        vscode.window.showWarningMessage(
            'Last ingested folder is no longer in the workspace or no longer exists.',
        );
        return;
    }
    const panel = WebviewService.createAnalysisPanel('GitIngest: Re-Ingest');
    panel.onDidDispose(() => {
        processManager.killCurrentProcess().catch(console.error);
    });
    try {
        await AnalysisService.verifyDependencies(panel);
        await AnalysisService.analyze(panel, pathTrimmed, 'Re-analyzing folder...');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Re-Ingest Failed', [errorMessage]);
    }
}
