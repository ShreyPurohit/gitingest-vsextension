import * as path from 'path';
import * as vscode from 'vscode';
import { COMMANDS } from './config';
import { AnalysisService, LAST_INGEST_OPTIONS_KEY } from './services/analysisService';
import { WebviewService } from './services/webviewService';
import { WorkspaceService } from './services/workspaceService';
import { processManager } from './utils/processManager';
import { readReIngestUnavailableReason } from './utils/reIngestAvailability';
import { urisFromScmMenuArgs } from './utils/scmGroupResources';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    AnalysisService.setScriptPath(context);
    AnalysisService.setContext(context);
    WorkspaceService.setContext(context);

    context.subscriptions.push(...registerCommands(context));
}

function registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
        vscode.commands.registerCommand(COMMANDS.analyze, handleAnalyze),
        // Explorer / palette: VS Code passes a resource Uri.
        vscode.commands.registerCommand(COMMANDS.analyzeFolder, runAnalyzeFolder),
        vscode.commands.registerCommand(COMMANDS.addToIngest, runAddToIngest),
        // SCM resource / folder / group menus share these entry points.
        vscode.commands.registerCommand(COMMANDS.analyzeFolderFromScm, handleAnalyzeFolderFromScm),
        vscode.commands.registerCommand(COMMANDS.addToIngestFromScm, handleAddToIngestFromScm),
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

/**
 * Prefer a directory target. For files or missing paths, use the parent via
 * `vscode.Uri.joinPath` (VS Code's URI path helper).
 */
async function resolveFolderTarget(resourceUri: vscode.Uri): Promise<vscode.Uri | undefined> {
    try {
        const stat = await vscode.workspace.fs.stat(resourceUri);
        if ((stat.type & vscode.FileType.Directory) !== 0) {
            return resourceUri;
        }
    } catch {
        // Fall back to the parent folder for files or deleted SCM entries.
    }

    const parent = vscode.Uri.joinPath(resourceUri, '..');
    if (parent.toString() === resourceUri.toString()) {
        return undefined;
    }

    return parent;
}

async function handleAnalyzeFolderFromScm(
    ...args: Array<vscode.SourceControlResourceState | vscode.SourceControlResourceGroup>
): Promise<void> {
    const uris = await urisFromScmMenuArgs(...args);
    await runAnalyzeFolder(uris[0]);
}

async function handleAddToIngestFromScm(
    ...args: Array<vscode.SourceControlResourceState | vscode.SourceControlResourceGroup>
): Promise<void> {
    const uris = await urisFromScmMenuArgs(...args);
    await runAddManyToIngest(uris);
}

async function runAnalyzeFolder(resourceUri?: vscode.Uri): Promise<void> {
    if (!resourceUri) {
        vscode.window.showErrorMessage('Invalid folder selected');
        return;
    }

    const targetUri = await resolveFolderTarget(resourceUri);
    if (!targetUri) {
        vscode.window.showErrorMessage('Invalid folder selected');
        return;
    }

    const folderName = path.basename(targetUri.fsPath);
    const panel = WebviewService.createAnalysisPanel(`GitIngest: ${folderName}`);

    panel.onDidDispose(() => {
        processManager.killCurrentProcess().catch(console.error);
    });

    try {
        await AnalysisService.verifyDependencies(panel);
        await AnalysisService.analyze(
            panel,
            targetUri.fsPath,
            `Analyzing folder: ${folderName}...`,
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Analysis Failed', [errorMessage]);
    }
}

async function runAddToIngest(resourceUri?: vscode.Uri): Promise<void> {
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

async function runAddManyToIngest(resourceUris: vscode.Uri[]): Promise<void> {
    if (resourceUris.length === 0) {
        vscode.window.showErrorMessage('No file or folder selected.');
        return;
    }

    try {
        if (resourceUris.length === 1) {
            await WorkspaceService.addToIngest(resourceUris[0]);
            return;
        }
        await WorkspaceService.addManyToIngest(resourceUris);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Failed to add the selected items to ingest.';
        vscode.window.showErrorMessage(message);
    }
}

async function handleReIngest(context: vscode.ExtensionContext): Promise<void> {
    const unavailableReason = readReIngestUnavailableReason(context);
    if (unavailableReason) {
        vscode.window.showWarningMessage(unavailableReason);
        return;
    }

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
        const lastOptions = context.workspaceState.get<unknown>(LAST_INGEST_OPTIONS_KEY);
        await AnalysisService.analyze(panel, pathTrimmed, 'Re-analyzing folder...', lastOptions);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        WebviewService.showError(panel, 'Re-Ingest Failed', [errorMessage]);
    }
}
