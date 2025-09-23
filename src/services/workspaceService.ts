import * as path from 'path';
import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';

export class WorkspaceService {
    private static readonly DEFAULT_INGEST_FOLDER_NAME = 'gitingest-ingest';

    public static getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        return vscode.workspace.workspaceFolders?.[0];
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
        const resourcePath = this.normalizeFsPath(resourceUri);
        const rootPath = this.normalizeFsPath(workspaceRoot);
        const ingestPath = this.normalizeFsPath(ingestRoot);
        if (this.isSameOrChild(ingestPath, resourcePath)) {
            vscode.window.showInformationMessage('Resource is already in the ingest folder.');
            return;
        }

        if (!this.isSameOrChild(rootPath, resourcePath)) {
            throw new Error('Selected item must be inside the workspace root.');
        }

        await vscode.workspace.fs.createDirectory(ingestRoot);

        // (No marker file is created here — the ingest folder is managed directly.)

        const stat = await vscode.workspace.fs.stat(resourceUri);
        const baseName = path.basename(resourcePath);
        if (!baseName) {
            throw new Error('Selected item has no name.');
        }

        const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;
        const destination = await this.getUniqueIngestChildUri(
            ingestRoot,
            baseName,
            isDirectory ? 'directory' : 'file',
        );

        try {
            await vscode.workspace.fs.copy(resourceUri, destination, { overwrite: false });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown copy error.';
            throw new Error(`Failed to add to ingest: ${message}`);
        }

        vscode.window.showInformationMessage(
            `Added to ingest: ${path.basename(destination.fsPath)}`,
        );
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

    private static normalizeFsPath(uri: vscode.Uri): string {
        return path.normalize(uri.fsPath);
    }

    private static isSameOrChild(basePath: string, candidatePath: string): boolean {
        const relative = path.relative(basePath, candidatePath);
        return (
            relative === '' ||
            (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
        );
    }

    private static getIngestRoot(workspaceRoot: vscode.Uri): vscode.Uri {
        const folderName = this.getIngestFolderName(workspaceRoot);
        return vscode.Uri.joinPath(workspaceRoot, folderName);
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

        try {
            // Check existence first
            await vscode.workspace.fs.stat(ingestRoot);
        } catch {
            // Nothing to delete
            return;
        }

        // Safety: ensure ingestRoot is inside the workspaceRoot
        try {
            const rel = path.relative(workspaceRoot.fsPath, ingestRoot.fsPath);
            if (rel.startsWith('..') || path.isAbsolute(rel)) {
                console.error(
                    'Ingest folder is not a child of workspace root; aborting delete',
                    ingestRoot.fsPath,
                );
                return;
            }
        } catch (e) {
            console.error('Failed to determine path relation for ingest cleanup', e);
            return;
        }

        try {
            await vscode.workspace.fs.delete(ingestRoot, { recursive: true, useTrash: true });
            vscode.window.showInformationMessage(`Deleted ingest folder: ${ingestRoot.fsPath}`);
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : 'Unknown error while deleting ingest folder';
            console.error('Failed to delete ingest folder', err);
            vscode.window.showErrorMessage(`Failed to delete ingest folder: ${msg}`);
        }
    }
}
