import * as path from 'path';
import * as vscode from 'vscode';
import { COMMANDS } from './config';
import { AnalysisService, LAST_INGEST_OPTIONS_KEY } from './services/analysisService';
import { WebviewService } from './services/webviewService';
import { WorkspaceService } from './services/workspaceService';
import { resolveFolderTarget } from './utils/folderTarget';
import { OsUtils } from './utils/osUtils';
import { processManager } from './utils/processManager';
import { readReIngestUnavailableReason } from './utils/reIngestAvailability';
import { urisFromScmMenuArgs } from './utils/scmGroupResources';
import { toGlobPattern } from './utils/treeParser';

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

async function handleAnalyzeFolderFromScm(
    ...resourceStates: vscode.SourceControlResourceState[]
): Promise<void> {
    const uris = await urisFromScmMenuArgs(...resourceStates);
    if (uris.length === 0) {
        vscode.window.showErrorMessage('Invalid folder selected');
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uris[0]);
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Invalid folder selected');
        return;
    }

    for (const uri of uris) {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder || folder.uri.toString() !== workspaceFolder.uri.toString()) {
            vscode.window.showErrorMessage('Invalid folder selected');
            return;
        }
    }

    // Digest only the selected changes: workspace-relative include globs.
    const includePatterns: string[] = [];
    const seen = new Set<string>();
    for (const uri of uris) {
        const relative = OsUtils.normalizePath(vscode.workspace.asRelativePath(uri, false));
        if (!relative || relative === uri.fsPath) {
            continue;
        }

        const folderTarget = await resolveFolderTarget(uri);
        const pattern = toGlobPattern(relative, folderTarget?.toString() === uri.toString());
        if (!pattern || seen.has(pattern)) {
            continue;
        }
        seen.add(pattern);
        includePatterns.push(pattern);
    }

    if (includePatterns.length === 0) {
        vscode.window.showErrorMessage('Invalid folder selected');
        return;
    }

    const baseOptions = AnalysisService.resolveIngestOptions(workspaceFolder.uri.fsPath);
    await analyzeResolvedFolder(workspaceFolder.uri, {
        ...baseOptions,
        includePatterns,
    });
}

async function handleAddToIngestFromScm(
    ...args: Array<vscode.SourceControlResourceState | vscode.SourceControlResourceGroup>
): Promise<void> {
    const uris = await urisFromScmMenuArgs(...args);
    await runAddManyToIngest(uris);
}

async function runAnalyzeFolder(resourceUri?: vscode.Uri): Promise<void> {
    const targetUri = resourceUri ? await resolveFolderTarget(resourceUri) : undefined;
    await analyzeResolvedFolder(targetUri);
}

async function analyzeResolvedFolder(
    targetUri?: vscode.Uri,
    optionsOverride?: unknown,
): Promise<void> {
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
            optionsOverride,
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
