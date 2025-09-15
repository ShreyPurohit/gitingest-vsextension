import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';

export class WorkspaceService {
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
}
