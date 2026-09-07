import * as path from 'path';
import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';
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

        const destination = await this.getUniqueIngestChildUri(
            destinationParent,
            leafName,
            isDirectory ? 'directory' : 'file',
        );

        try {
            await vscode.workspace.fs.copy(resourceUri, destination, { overwrite: false });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown copy error.';
            throw new Error(`Failed to add to ingest: ${message}`);
        }

        const addedPath = path
            .relative(ingestRoot.fsPath, destination.fsPath)
            .split(path.sep)
            .join('/');
        vscode.window.showInformationMessage(`Added to ingest: ${addedPath}`);
    }

    private static async getUniqueRootFileUri(
        root: vscode.Uri,
        baseName: string,
        ext: string,
    ): Promise<vscode.Uri> {
        let attempt = 0;
        while (true) {
            const name = attempt === 0 ? `${baseName}${ext}` : `${baseName} (${attempt})${ext}`;
            const uri = vscode.Uri.joinPath(root, name);
            try {
                await vscode.workspace.fs.stat(uri);
                attempt += 1;
            } catch {
                return uri;
            }
        }
    }

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

    private static async getUniqueIngestChildUri(
        parent: vscode.Uri,
        name: string,
        kind: 'file' | 'directory',
    ): Promise<vscode.Uri> {
        const parsed = path.parse(name);
        const baseName = parsed.name || parsed.base; // parsed.base covers names like '..'
        const extension = kind === 'file' ? parsed.ext : '';
        let attempt = 0;

        while (true) {
            const candidateName =
                attempt === 0
                    ? name
                    : extension && kind === 'file'
                      ? `${baseName} (${attempt})${extension}`
                      : `${baseName} (${attempt})`;
            const candidate = vscode.Uri.joinPath(parent, candidateName);
            try {
                await vscode.workspace.fs.stat(candidate);
                attempt += 1;
            } catch {
                return candidate;
            }
        }
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
