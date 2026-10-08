import * as path from 'path';
import * as vscode from 'vscode';
import {
    DEFAULT_MAX_FILE_SIZE,
    ERROR_MESSAGES,
    LAST_INGEST_OPTIONS_KEY,
    LAST_INGESTED_PATH_KEY,
    VERIFIED_STATUS,
} from '../config';
import { AnalysisResult, IngestOptions, StatusMessage } from '../types';
import { extractGitingestJsonPayload } from '../utils/gitingestPayload';
import { normalizeIngestOptions, serializeIngestOptions } from '../utils/ingestOptions';
import { PythonHandler } from '../utils/pythonHandler';
import {
    reIngestUnavailableAfterCleanup,
    writeReIngestUnavailableReason,
} from '../utils/reIngestAvailability';
import { WebviewService } from './webviewService';
import { WorkspaceService } from './workspaceService';

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

        await this.pythonHandler.verifyPythonInstallation();
        statusMessages.push(VERIFIED_STATUS[0]);
        WebviewService.updateLoadingStatus(panel, statusMessages);

        await this.pythonHandler.verifyGitIngest();
        statusMessages.push(VERIFIED_STATUS[1]);
        WebviewService.updateLoadingStatus(panel, statusMessages);
    }

    public static async analyze(
        panel: vscode.WebviewPanel,
        targetPath: string,
        statusMessage: string,
        optionsOverride?: unknown,
    ): Promise<void> {
        WebviewService.updateLoadingStatus(panel, [
            ...VERIFIED_STATUS,
            { text: statusMessage, type: 'info' },
        ]);

        const options = this.resolveIngestOptions(targetPath, optionsOverride);
        const result = await this.getOutput(targetPath, options);

        if (result.type === 'error') {
            throw new Error(result.message);
        }

        if (result.data) {
            // Capture before cleanup clears tracking.
            const analyzedTrackedIngestRoot = WorkspaceService.isTrackedIngestRoot(targetPath);

            let cleanupDeleted = false;
            try {
                const workspaceRoot = WorkspaceService.getWorkspaceFolder();
                if (workspaceRoot) {
                    cleanupDeleted = await WorkspaceService.cleanupIngestFolder(
                        workspaceRoot.uri,
                        targetPath,
                    );
                }
            } catch (cleanupError) {
                console.error('Error cleaning up ingest folder:', cleanupError);
            }

            const reIngestUnavailableReason = reIngestUnavailableAfterCleanup({
                analyzedTrackedIngestRoot,
                cleanupDeleted,
            });

            if (this.extensionContext) {
                await this.extensionContext.workspaceState.update(
                    LAST_INGESTED_PATH_KEY,
                    targetPath,
                );
                await this.extensionContext.workspaceState.update(LAST_INGEST_OPTIONS_KEY, options);
                await writeReIngestUnavailableReason(
                    this.extensionContext,
                    reIngestUnavailableReason,
                );
            }

            WebviewService.showResults(panel, result.data, targetPath, {
                applied: options,
                defaults: this.resolveIngestOptions(targetPath),
                reIngestUnavailableReason,
            });
        } else {
            throw new Error('Analysis result data is undefined');
        }
    }

    /**
     * Resolve the filter options for a run: an explicit override (from the results panel)
     * wins over the workspace settings, which fall back to the packaged defaults.
     */
    public static resolveIngestOptions(
        targetPath: string,
        optionsOverride?: unknown,
    ): IngestOptions {
        if (optionsOverride !== undefined && optionsOverride !== null) {
            return normalizeIngestOptions(optionsOverride);
        }

        const resource =
            vscode.workspace.getWorkspaceFolder(vscode.Uri.file(targetPath))?.uri ??
            WorkspaceService.getWorkspaceFolder()?.uri;
        if (!resource) {
            return normalizeIngestOptions(undefined);
        }

        const config = vscode.workspace.getConfiguration('gitingest', resource);
        return normalizeIngestOptions({
            includePatterns: config.get<string[]>('includePatterns', []),
            excludePatterns: config.get<string[]>('fileExclusions', []),
            maxFileSize: config.get<number>('maxFileSize', DEFAULT_MAX_FILE_SIZE),
        });
    }

    public static async getOutput(
        repoPath: string,
        options?: IngestOptions,
    ): Promise<AnalysisResult> {
        const pathTrimmed = typeof repoPath === 'string' ? repoPath.trim() : '';
        if (!pathTrimmed) {
            return {
                type: 'error',
                message: 'Invalid or missing repository path.',
            };
        }
        try {
            const resolved = options ?? this.resolveIngestOptions(pathTrimmed);
            const serialized = serializeIngestOptions(resolved);
            const args = serialized ? [pathTrimmed, serialized] : [pathTrimmed];
            const output = await this.pythonHandler.executeScriptWithProcess(this.scriptPath, args);
            const jsonPayload = extractGitingestJsonPayload(output);
            return {
                type: 'success',
                data: JSON.parse(jsonPayload),
            };
        } catch (error) {
            return {
                type: 'error',
                message: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
            };
        }
    }
}
