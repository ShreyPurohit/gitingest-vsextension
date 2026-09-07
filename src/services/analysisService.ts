import * as path from 'path';
import * as vscode from 'vscode';
import { DEFAULT_MAX_FILE_SIZE, ERROR_MESSAGES } from '../config';
import { AnalysisResult, IngestOptions, StatusMessage } from '../types';
import { normalizeIngestOptions, serializeIngestOptions } from '../utils/ingestOptions';
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

            await this.pythonHandler.verifyGitIngest();
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
        optionsOverride?: Partial<IngestOptions>,
    ): Promise<void> {
        WebviewService.updateLoadingStatus(panel, [
            { text: 'Python installation verified ✓', type: 'success' },
            { text: 'GitIngest package verified ✓', type: 'success' },
            { text: statusMessage, type: 'info' },
        ]);

        const options = this.resolveIngestOptions(targetPath, optionsOverride);
        const result = await this.getOutput(targetPath, options);

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

    /**
     * Resolve the filter options for a run: an explicit override (from the results panel)
     * wins over the workspace settings, which fall back to the packaged defaults.
     */
    public static resolveIngestOptions(
        targetPath: string,
        optionsOverride?: Partial<IngestOptions>,
    ): IngestOptions {
        if (optionsOverride) {
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
            const jsonPayload = this.extractJsonPayload(output);
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

    /**
     * Extract the JSON payload from stdout that may contain warnings or other noise.
     * Looks for delimiters emitted by gitingest-script.py; falls back to raw output
     * for backward compatibility.
     */
    private static extractJsonPayload(output: string): string {
        const startMarker = '__GITINGEST_JSON_START__';
        const endMarker = '__GITINGEST_JSON_END__';
        const startIdx = output.indexOf(startMarker);
        const endIdx = output.indexOf(endMarker);

        if (startIdx !== -1 && endIdx !== -1) {
            return output.substring(startIdx + startMarker.length, endIdx).trim();
        }

        // Fallback: try to find the first { and last } for raw JSON
        const firstBrace = output.indexOf('{');
        const lastBrace = output.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return output.substring(firstBrace, lastBrace + 1);
        }

        return output;
    }
}
