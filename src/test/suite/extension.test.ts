import * as assert from 'assert';
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
        const commands = await vscode.commands.getCommands();
        const gitingestCommands = [
            'vscode-gitingest.analyze',
            'vscode-gitingest.analyzeFolder',
            'vscode-gitingest.addToIngest',
        ];
        for (const cmd of gitingestCommands) {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        }
    });
});
