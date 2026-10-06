import * as assert from 'assert';
import * as vscode from 'vscode';
import { urisFromScmMenuArgs, urisFromScmResourceGroups } from '../../utils/scmGroupResources';

describe('scmGroupResources', () => {
    it('collects resourceStates from SCM groups when present', async () => {
        const first = vscode.Uri.file('/workspace/a.ts');
        const second = vscode.Uri.file('/workspace/b.ts');
        const uris = await urisFromScmResourceGroups([
            {
                id: 'workingTree',
                label: 'Changes',
                resourceStates: [{ resourceUri: first }, { resourceUri: second }],
                dispose: () => undefined,
            },
        ]);

        assert.deepStrictEqual(
            uris.map((uri) => uri.fsPath),
            [first.fsPath, second.fsPath],
        );
    });

    it('urisFromScmMenuArgs reads resource states directly', async () => {
        const file = vscode.Uri.file('/workspace/file.ts');
        const uris = await urisFromScmMenuArgs({ resourceUri: file });
        assert.strictEqual(uris.length, 1);
        assert.strictEqual(uris[0].fsPath, file.fsPath);
    });

    it('urisFromScmMenuArgs resolves groups via resourceStates', async () => {
        const file = vscode.Uri.file('/workspace/group-file.ts');
        const uris = await urisFromScmMenuArgs({
            id: 'workingTree',
            label: 'Changes',
            resourceStates: [{ resourceUri: file }],
            dispose: () => undefined,
        });
        assert.strictEqual(uris.length, 1);
        assert.strictEqual(uris[0].fsPath, file.fsPath);
    });
});
