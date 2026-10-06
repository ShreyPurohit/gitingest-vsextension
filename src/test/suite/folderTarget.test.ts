import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { resolveFolderTarget } from '../../utils/folderTarget';

describe('folderTarget', () => {
    it('keeps directories as-is', async () => {
        const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gitingest-folder-'));
        try {
            const folder = vscode.Uri.file(folderPath);
            const target = await resolveFolderTarget(folder);
            assert.strictEqual(target?.fsPath, folder.fsPath);
        } finally {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    });

    it('uses the parent for an existing file', async () => {
        const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gitingest-file-'));
        const filePath = path.join(folderPath, 'sample.ts');
        fs.writeFileSync(filePath, 'export {};\n', 'utf8');
        try {
            const folder = vscode.Uri.file(folderPath);
            const file = vscode.Uri.file(filePath);
            const target = await resolveFolderTarget(file);
            assert.strictEqual(target?.fsPath, folder.fsPath);
        } finally {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    });

    it('uses the parent for a missing/deleted path', async () => {
        const folderPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gitingest-missing-'));
        try {
            const folder = vscode.Uri.file(folderPath);
            const missingFile = vscode.Uri.file(path.join(folder.fsPath, 'missing-file.ts'));
            const target = await resolveFolderTarget(missingFile);
            assert.strictEqual(target?.fsPath, folder.fsPath);
        } finally {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    });

    it('returns undefined when a file URI has no parent segment', async () => {
        // joinPath('..') on a bare filename-style URI should not invent a folder target.
        const dangling = vscode.Uri.from({ scheme: 'file', path: '/only-file' });
        const parent = vscode.Uri.joinPath(dangling, '..');
        if (parent.toString() === dangling.toString() || parent.fsPath === dangling.fsPath) {
            const target = await resolveFolderTarget(dangling);
            assert.strictEqual(target, undefined);
        } else {
            const target = await resolveFolderTarget(dangling);
            assert.ok(target);
            assert.notStrictEqual(target.fsPath, dangling.fsPath);
        }
    });
});
