import * as path from 'path';
import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';
import { copyIntoIngest, findFreeName, IngestFileSystem } from '../utils/ingestCopy';
import { isSameOrChild, normalizePath, resolveIngestDestination } from '../utils/ingestPaths';

export class WorkspaceService {
    private static readonly DEFAULT_INGEST_FOLDER_NAME = 'gitingest-ingest';
    private static readonly TRACKED_INGEST_PATH_KEY = 'gitingest.trackedIngestPath';
    private static extensionContext: vscode.ExtensionContext | undefined;

    public static setContext(context: vscode.ExtensionContext): void {
        this.extensionContext = context;
    }

    public static getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        return vscode.workspace.workspaceFolders?.[0];
    }

    private static getTrackedIngestPath(): string | undefined {
        return this.extensionContext?.workspaceState.get<string>(this.TRACKED_INGEST_PATH_KEY);
    }

    private static setTrackedIngestPath(pathValue: string): Thenable<void> {
        if (!this.extensionContext) {
            return Promise.reject(new Error('Extension context not initialized'));
        }
        return this.extensionContext.workspaceState.update(this.TRACKED_INGEST_PATH_KEY, pathValue);
    }

    private static clearTrackedIngestPath(): Thenable<void> {
        if (!this.extensionContext) {
            return Promise.reject(new Error('Extension context not initialized'));
        }
        return this.extensionContext.workspaceState.update(this.TRACKED_INGEST_PATH_KEY, undefined);
    }

    public static async saveResultsToFile(data: {
        summary: string;
        tree: string;
        content: string;
    }): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
        }

        const content = this.formatAnalysisContent(data);
        const targetUri = await this.getUniqueRootFileUri(workspaceFolder.uri, 'digest', '.txt');

        try {
            await vscode.workspace.fs.writeFile(targetUri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Analysis saved to ${targetUri.fsPath}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to write file: ${msg}`);
            throw err;
        }
    }

    public static async addToIngest(resourceUri: vscode.Uri): Promise<void> {
        if (!resourceUri) {
            throw new Error('No resource selected.');
        }

        const workspaceFolder =
            vscode.workspace.getWorkspaceFolder(resourceUri) ?? this.getWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
        }

        const workspaceRoot = workspaceFolder.uri;
        const ingestRoot = this.getIngestRoot(workspaceRoot);
        const resourcePath = normalizePath(resourceUri.fsPath);
        const rootPath = normalizePath(workspaceRoot.fsPath);
        const ingestPath = normalizePath(ingestRoot.fsPath);
        if (isSameOrChild(ingestPath, resourcePath)) {
            vscode.window.showInformationMessage('Resource is already in the ingest folder.');
            return;
        }

        const destinationInfo = resolveIngestDestination(
            rootPath,
            resourcePath,
            this.shouldPreserveStructure(workspaceRoot),
        );

        await vscode.workspace.fs.createDirectory(ingestRoot);
        await this.setTrackedIngestPath(ingestRoot.fsPath);

        const stat = await vscode.workspace.fs.stat(resourceUri);
        const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;

        const parentSegments = destinationInfo.segments.slice(0, -1);
        const leafName = destinationInfo.segments[destinationInfo.segments.length - 1];
        const destinationParent =
            parentSegments.length > 0
                ? vscode.Uri.joinPath(ingestRoot, ...parentSegments)
                : ingestRoot;
        if (parentSegments.length > 0) {
            await vscode.workspace.fs.createDirectory(destinationParent);
        }

        let destination: string;
        try {
            destination = await copyIntoIngest(
                this.fileSystem,
                resourceUri.fsPath,
                destinationParent.fsPath,
                leafName,
                isDirectory,
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown copy error.';
            throw new Error(`Failed to add to ingest: ${message}`);
        }

        const addedPath = path.relative(ingestRoot.fsPath, destination).split(path.sep).join('/');
        vscode.window.showInformationMessage(`Added to ingest: ${addedPath}`);
    }

    private static async getUniqueRootFileUri(
        root: vscode.Uri,
        baseName: string,
        ext: string,
    ): Promise<vscode.Uri> {
        const free = await findFreeName(this.fileSystem, root.fsPath, `${baseName}${ext}`, 'file');
        return vscode.Uri.file(free);
    }

    /** `vscode.workspace.fs` behind the path-based port used by the staging helpers. */
    private static readonly fileSystem: IngestFileSystem = {
        async exists(targetPath: string): Promise<boolean> {
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(targetPath));
                return true;
            } catch {
                return false;
            }
        },
        async readDirectory(directoryPath: string) {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(directoryPath));
            return entries.map(([name, type]) => ({
                name,
                isDirectory: (type & vscode.FileType.Directory) !== 0,
            }));
        },
        async createDirectory(directoryPath: string): Promise<void> {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(directoryPath));
        },
        async copy(sourcePath: string, destinationPath: string): Promise<void> {
            await vscode.workspace.fs.copy(
                vscode.Uri.file(sourcePath),
                vscode.Uri.file(destinationPath),
                { overwrite: false },
            );
        },
    };

    private static formatAnalysisContent(data: {
        summary: string;
        tree: string;
        content: string;
    }): string {
        return [
            '# Repository Analysis\n',
            '## Summary\n',
            data.summary,
            '\n## Directory Structure\n',
            data.tree,
            '\n## Files Content\n',
            data.content,
        ].join('\n');
    }

    private static getIngestRoot(workspaceRoot: vscode.Uri): vscode.Uri {
        const folderName = this.getIngestFolderName(workspaceRoot);
        return vscode.Uri.joinPath(workspaceRoot, folderName);
    }

    private static shouldPreserveStructure(workspaceRoot: vscode.Uri): boolean {
        return vscode.workspace
            .getConfiguration('gitingest', workspaceRoot)
            .get<boolean>('preserveStructureOnAdd', true);
    }

    private static getIngestFolderName(workspaceRoot: vscode.Uri): string {
        const config = vscode.workspace.getConfiguration('gitingest', workspaceRoot);
        const configured = config.get<string>('ingestFolderName', this.DEFAULT_INGEST_FOLDER_NAME);

        const sanitized = configured.replace(/[\\/]/g, '').trim();
        if (!sanitized || sanitized === '.' || sanitized === '..') {
            return this.DEFAULT_INGEST_FOLDER_NAME;
        }

        if (!/^[a-zA-Z0-9 _.-]+$/.test(sanitized)) {
            return this.DEFAULT_INGEST_FOLDER_NAME;
        }

        return sanitized;
    }

    /**
     * Delete the ingest root folder if the workspace configuration requests it.
     * This is a no-op when the setting `gitingest.deleteAfterIngest` is false or
     * when the ingest folder does not exist.
     */
    public static async cleanupIngestFolder(workspaceRoot: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration('gitingest', workspaceRoot);
        const deleteAfter = config.get<boolean>('deleteAfterIngest', false);
        if (!deleteAfter) {
            return;
        }

        const ingestRoot = this.getIngestRoot(workspaceRoot);
        const trackedIngestPath = this.getTrackedIngestPath();
        const isTrackedPath =
            typeof trackedIngestPath === 'string' &&
            path.resolve(trackedIngestPath) === path.resolve(ingestRoot.fsPath);

        if (!isTrackedPath) {
            return;
        }

        try {
            await vscode.workspace.fs.stat(ingestRoot);
        } catch {
            await this.clearTrackedIngestPath();
            return;
        }

        try {
            const rel = path.relative(workspaceRoot.fsPath, ingestRoot.fsPath);
            if (rel.startsWith('..') || path.isAbsolute(rel)) {
                console.error(
                    'Ingest folder is not a child of workspace root; aborting delete',
                    ingestRoot.fsPath,
                );
                return;
            }
        } catch (error) {
            console.error('Failed to determine path relation for ingest cleanup', error);
            return;
        }

        try {
            await vscode.workspace.fs.delete(ingestRoot, { recursive: true, useTrash: true });
            vscode.window.showInformationMessage(`Deleted ingest folder: ${ingestRoot.fsPath}`);
            await this.clearTrackedIngestPath();
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : 'Unknown error while deleting ingest folder';
            console.error('Failed to delete ingest folder', err);
            vscode.window.showErrorMessage(`Failed to delete ingest folder: ${msg}`);
        }
    }
}
