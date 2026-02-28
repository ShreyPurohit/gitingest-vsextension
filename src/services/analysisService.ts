import * as path from 'path';
import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';
import { AnalysisResult, StatusMessage } from '../types';
import { PythonHandler } from '../utils/pythonHandler';
import { WebviewService } from './webviewService';
import { WorkspaceService } from './workspaceService';

const LAST_INGESTED_PATH_KEY = 'gitingest.lastIngestedPath';

export class AnalysisService {
    private static pythonHandler = PythonHandler.getInstance();
    private static scriptPath: string;
    private static extensionContext: vscode.ExtensionContext | undefined;

    public static setScriptPath(context: vscode.ExtensionContext): void {
        this.scriptPath = context.asAbsolutePath(path.join('src', 'gitingest-script.py'));
    }

    public static setContext(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
    }

    public static async verifyDependencies(panel: vscode.WebviewPanel): Promise<void> {
        const statusMessages: StatusMessage[] = [];
        const workspaceFolder = WorkspaceService.getWorkspaceFolder();

        if (!workspaceFolder) {
            throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
        }

        try {
            await this.pythonHandler.verifyPythonInstallation();
            statusMessages.push({ text: 'Python installation verified ✓', type: 'success' });
            WebviewService.updateLoadingStatus(panel, statusMessages);

            await this.pythonHandler.verifyGitIngest(workspaceFolder.uri.fsPath);
            statusMessages.push({ text: 'GitIngest package verified ✓', type: 'success' });
            WebviewService.updateLoadingStatus(panel, statusMessages);
        } catch (error) {
            throw error;
        }
    }

    public static async analyze(
        panel: vscode.WebviewPanel,
        targetPath: string,
        statusMessage: string,
    ): Promise<void> {
        WebviewService.updateLoadingStatus(panel, [
            { text: 'Python installation verified ✓', type: 'success' },
            { text: 'GitIngest package verified ✓', type: 'success' },
            { text: statusMessage, type: 'info' },
        ]);

        const result = await this.getOutput(targetPath);

        if (result.type === 'error') {
            throw new Error(result.message);
        }

        if (result.data) {
            WebviewService.showResults(panel, result.data, targetPath);
            if (this.extensionContext) {
                this.extensionContext.workspaceState.update(LAST_INGESTED_PATH_KEY, targetPath);
            }
            // After successfully showing results, attempt to clean up staged ingest folder
            try {
                const workspaceRoot = WorkspaceService.getWorkspaceFolder();
                if (workspaceRoot) {
                    await WorkspaceService.cleanupIngestFolder(workspaceRoot.uri);
                }
            } catch (cleanupError) {
                // Log but don't disrupt successful analysis result display
                console.error('Error cleaning up ingest folder:', cleanupError);
            }
        } else {
            throw new Error('Analysis result data is undefined');
        }
    }

    public static async getOutput(repoPath: string): Promise<AnalysisResult> {
        const pathTrimmed = typeof repoPath === 'string' ? repoPath.trim() : '';
        if (!pathTrimmed) {
            return {
                type: 'error',
                message: 'Invalid or missing repository path.',
            };
        }
        try {
            const resource =
                vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pathTrimmed))?.uri ??
                WorkspaceService.getWorkspaceFolder()?.uri;
            const fileExclusions =
                (resource
                    ? vscode.workspace
                          .getConfiguration('gitingest', resource)
                          .get<string[]>('fileExclusions', [])
                    : []) ?? [];
            const patterns = fileExclusions.filter(
                (p): p is string => typeof p === 'string' && p.trim() !== '',
            );
            const args =
                patterns.length > 0 ? [pathTrimmed, JSON.stringify(patterns)] : [pathTrimmed];
            const output = await this.pythonHandler.executeScriptWithProcess(this.scriptPath, args);
            return {
                type: 'success',
                data: JSON.parse(output),
            };
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
            };
        }
    }
}
