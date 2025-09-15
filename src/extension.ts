import * as vscode from 'vscode';
import { COMMANDS } from './config';
import { AnalysisService } from './services/analysisService';
import { WebviewService } from './services/webviewService';
import { WorkspaceService } from './services/workspaceService';
import { processManager } from './utils/processManager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    AnalysisService.setScriptPath(context);

    const statusBarItem = createStatusBarItem();
    const commands = registerCommands();

    context.subscriptions.push(...commands, statusBarItem);

    await showSetupGuideIfNeeded(context);
}

function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
    statusBarItem.name = 'GitIngest';
    statusBarItem.text = '$(file-zip) GitIngest';
    statusBarItem.tooltip = 'Analyze Repository with GitIngest';
    statusBarItem.command = COMMANDS.analyze;
    statusBarItem.show();

    return statusBarItem;
}

function registerCommands(): vscode.Disposable[] {
    return [
        vscode.commands.registerCommand(COMMANDS.setup, handleSetup),
        vscode.commands.registerCommand(COMMANDS.analyze, handleAnalyze),
        vscode.commands.registerCommand(COMMANDS.analyzeFolder, handleAnalyzeFolder),
    ];
}

async function showSetupGuideIfNeeded(context: vscode.ExtensionContext): Promise<void> {
    const hasShownSetup = context.globalState.get('gitingestSetup', false);
    if (!hasShownSetup) {
        await handleSetup();
        await context.globalState.update('gitingestSetup', true);
    }
}

async function handleSetup(): Promise<void> {
    const panel = WebviewService.createSetupPanel();
    WebviewService.setupMessageHandler(panel);
}

async function handleAnalyze(panel?: vscode.WebviewPanel): Promise<void> {
    if (!panel) {
        panel = WebviewService.createAnalysisPanel();
    }

    panel.onDidDispose(() => {
        processManager.killCurrentProcess().catch(console.error);
    });

    WebviewService.setupMessageHandler(panel);

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

    const folderName = folderUri.fsPath.split('/').pop() || '';
    const panel = WebviewService.createAnalysisPanel(`GitIngest: ${folderName}`);

    panel.onDidDispose(() => {
        processManager.killCurrentProcess().catch(console.error);
    });

    WebviewService.setupMessageHandler(panel);

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
