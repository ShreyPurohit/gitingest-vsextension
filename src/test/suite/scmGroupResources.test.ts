import * as assert from 'assert';
import * as vscode from 'vscode';
import {
    changedFolderChoices,
    filterUrisUnderRelativeFolder,
    resolveScmSelection,
    urisFromScmMenuArgs,
    urisFromScmResourceGroups,
} from '../../utils/scmGroupResources';

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

    it('dedupes URIs across resource states and groups', async () => {
        const shared = vscode.Uri.file('/workspace/shared.ts');
        const other = vscode.Uri.file('/workspace/other.ts');

        const fromStates = await urisFromScmMenuArgs(
            { resourceUri: shared },
            { resourceUri: shared },
            { resourceUri: other },
        );
        assert.strictEqual(fromStates.length, 2);

        const fromGroups = await urisFromScmResourceGroups([
            {
                id: 'workingTree',
                label: 'Changes',
                resourceStates: [{ resourceUri: shared }],
                dispose: () => undefined,
            },
            {
                id: 'index',
                label: 'Staged Changes',
                resourceStates: [{ resourceUri: shared }, { resourceUri: other }],
                dispose: () => undefined,
            },
        ]);
        assert.strictEqual(fromGroups.length, 2);
    });

    it('returns an empty list for empty args and unknown empty groups', async () => {
        assert.deepStrictEqual(await urisFromScmMenuArgs(), []);
        assert.deepStrictEqual(
            await urisFromScmResourceGroups([
                {
                    id: '',
                    label: 'Empty',
                    resourceStates: [],
                    dispose: () => undefined,
                },
            ]),
            [],
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

    it('resolveScmSelection marks resource states as scoped', async () => {
        const file = vscode.Uri.file('/workspace/src/a.ts');
        const result = await resolveScmSelection({ resourceUri: file });
        assert.strictEqual(result.scopeResolved, true);
        assert.strictEqual(result.uris.length, 1);
        assert.strictEqual(result.uris[0].fsPath, file.fsPath);
    });

    it('resolveScmSelection marks intentional group headers as scoped', async () => {
        const first = vscode.Uri.file('/workspace/src/a.ts');
        const second = vscode.Uri.file('/workspace/lib/b.ts');
        const result = await resolveScmSelection({
            id: 'workingTree',
            label: 'Changes',
            resourceStates: [{ resourceUri: first }, { resourceUri: second }],
            dispose: () => undefined,
        });
        assert.strictEqual(result.scopeResolved, true);
        assert.strictEqual(result.uris.length, 2);
    });

    it('resolveScmSelection leaves marshalled handles unscoped', async () => {
        // Kiro-style un-revived ScmResource: no resourceUri / group fields.
        const handle = {
            $mid: 3,
            groupHandle: 2,
            handle: 1,
            sourceControlHandle: 0,
        } as unknown as vscode.SourceControlResourceGroup;

        const result = await resolveScmSelection(handle);
        assert.strictEqual(result.scopeResolved, false);
    });

    it('changedFolderChoices lists ancestor folders', () => {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            // Empty test host — skip without failing the suite.
            return;
        }

        const left = vscode.Uri.joinPath(workspace.uri, 'src', 'services', 'a.ts');
        const right = vscode.Uri.joinPath(workspace.uri, 'src', 'utils', 'b.ts');
        const folders = changedFolderChoices([left, right]);
        assert.ok(folders.includes('src'));
        assert.ok(folders.includes('src/services'));
        assert.ok(folders.includes('src/utils'));
    });

    it('filterUrisUnderRelativeFolder keeps only the chosen subtree', () => {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            return;
        }

        const left = vscode.Uri.joinPath(workspace.uri, 'src', 'services', 'a.ts');
        const right = vscode.Uri.joinPath(workspace.uri, 'src', 'utils', 'b.ts');
        const filtered = filterUrisUnderRelativeFolder([left, right], 'src/services');
        assert.strictEqual(filtered.length, 1);
        assert.strictEqual(filtered[0].toString(), left.toString());
    });
});
