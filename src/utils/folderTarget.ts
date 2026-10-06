import * as vscode from 'vscode';

/**
 * Prefer a directory target. For files or missing paths, use the parent via
 * `vscode.Uri.joinPath`. Returns undefined when there is no sensible parent
 * (e.g. filesystem root).
 */
export async function resolveFolderTarget(
    resourceUri: vscode.Uri,
): Promise<vscode.Uri | undefined> {
    if (!resourceUri) {
        return undefined;
    }

    try {
        const stat = await vscode.workspace.fs.stat(resourceUri);
        if ((stat.type & vscode.FileType.Directory) !== 0) {
            return resourceUri;
        }
    } catch {
        // Fall back to the parent folder for files or deleted SCM entries.
    }

    const parent = vscode.Uri.joinPath(resourceUri, '..');
    if (parent.toString() === resourceUri.toString() || parent.fsPath === resourceUri.fsPath) {
        return undefined;
    }

    return parent;
}
