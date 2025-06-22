import * as path from 'path';
import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../config';

export class WorkspaceService {
    public static getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        return vscode.workspace.workspaceFolders?.[0];
    }

    public static async saveResultsToFile(data: { summary: string; tree: string; content: string }): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
        }

        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, 'digest.txt');
        const content = this.formatAnalysisContent(data);

        try {
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Analysis saved to ${filePath.fsPath}`);
        } catch (err) {
            vscode.window.showErrorMessage(`❌ Failed to write file: ${err instanceof Error ? err.message : 'Unknown error'}`);
            throw err;
        }
    }


    private static formatAnalysisContent(data: { summary: string; tree: string; content: string }): string {
        return [
            '# Repository Analysis\n',
            '## Summary\n',
            data.summary,
            '\n## Directory Structure\n',
            data.tree,
            '\n## Files Content\n',
            data.content
        ].join('\n');
    }
}