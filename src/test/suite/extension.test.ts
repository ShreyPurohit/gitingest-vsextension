import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

describe('Extension', () => {
    it('extension is present', () => {
        const ext = vscode.extensions.getExtension('iamshreydxv.gitingest');
        assert.ok(ext, 'Extension iamshreydxv.gitingest should be found');
    });

    it('extension activates', async () => {
        const ext = vscode.extensions.getExtension('iamshreydxv.gitingest');
        assert.ok(ext);
        await ext.activate();
        assert.ok(ext.isActive);
    });

    it('contributed commands are registered', async () => {
        const ext = vscode.extensions.getExtension('iamshreydxv.gitingest');
        assert.ok(ext);
        await ext.activate();
        const commands = await vscode.commands.getCommands();
        const gitingestCommands = [
            'vscode-gitingest.analyze',
            'vscode-gitingest.analyzeFolder',
            'vscode-gitingest.addToIngest',
            'vscode-gitingest.analyzeFolderFromScm',
            'vscode-gitingest.addToIngestFromScm',
            'vscode-gitingest.reIngest',
        ];
        for (const cmd of gitingestCommands) {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        }
    });

    it('wires Explorer and Source Control to typed command entry points', () => {
        const packageJsonPath = path.resolve(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const menus = packageJson.contributes.menus;

        const explorerCommands = (menus['explorer/context'] ?? []).map(
            (entry: { command?: string }) => entry.command,
        );
        assert.ok(explorerCommands.includes('vscode-gitingest.analyzeFolder'));
        assert.ok(explorerCommands.includes('vscode-gitingest.addToIngest'));

        for (const menuId of [
            'scm/resourceState/context',
            'scm/resourceFolder/context',
            'scm/resourceGroup/context',
        ]) {
            const entries = menus[menuId] ?? [];
            const commands = entries.map((entry: { command?: string }) => entry.command);
            assert.ok(
                commands.includes('vscode-gitingest.analyzeFolderFromScm'),
                `${menuId} should include Analyze This Folder`,
            );
            assert.ok(
                commands.includes('vscode-gitingest.addToIngestFromScm'),
                `${menuId} should include Add to Ingest`,
            );
            for (const entry of entries) {
                assert.strictEqual(entry.when, 'scmProvider == git');
            }
        }

        const palette = menus.commandPalette ?? [];
        const hidden = new Set(
            palette
                .filter((entry: { when?: string }) => entry.when === 'false')
                .map((entry: { command?: string }) => entry.command),
        );
        assert.ok(hidden.has('vscode-gitingest.analyzeFolderFromScm'));
        assert.ok(hidden.has('vscode-gitingest.addToIngestFromScm'));
    });
});
