import * as vscode from 'vscode';

const GIT_API_WAIT_MS = 5_000;

/** Minimal Git extension API surface used to resolve SCM group contents. */
interface GitExtension {
    getAPI(version: 1): GitAPI;
}

interface GitAPI {
    state: 'uninitialized' | 'initialized';
    onDidChangeState: vscode.Event<'uninitialized' | 'initialized'>;
    repositories: readonly GitRepository[];
    getRepository(uri: vscode.Uri): GitRepository | null;
}

interface GitChange {
    uri: vscode.Uri;
}

interface GitRepository {
    rootUri: vscode.Uri;
    state: {
        workingTreeChanges: readonly GitChange[];
        indexChanges: readonly GitChange[];
        mergeChanges: readonly GitChange[];
        untrackedChanges?: readonly GitChange[];
    };
}

function dedupeUris(uris: readonly vscode.Uri[]): vscode.Uri[] {
    const seen = new Set<string>();
    const result: vscode.Uri[] = [];
    for (const uri of uris) {
        const key = uri.toString();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(uri);
    }
    return result;
}

function urisFromResourceStates(
    states: readonly vscode.SourceControlResourceState[] | undefined,
): vscode.Uri[] {
    if (!states?.length) {
        return [];
    }
    return states.map((state) => state.resourceUri).filter((uri): uri is vscode.Uri => !!uri);
}

function sameFsPath(left: vscode.Uri, right: vscode.Uri): boolean {
    return (
        left.fsPath.replace(/\\/g, '/').toLowerCase() ===
        right.fsPath.replace(/\\/g, '/').toLowerCase()
    );
}

function changesForGroup(repository: GitRepository, groupId: string): readonly GitChange[] {
    const { state } = repository;
    switch (groupId) {
        case 'workingTree':
            return state.workingTreeChanges;
        case 'index':
            return state.indexChanges;
        case 'merge':
            return state.mergeChanges;
        case 'untracked':
            return state.untrackedChanges ?? [];
        default:
            return [];
    }
}

/**
 * Pick repositories for a Git SCM group when `resourceStates` is unavailable.
 * Prefer getRepository(hint), then the single repo that has changes for that group.
 * Never merge changes from unrelated multi-root repositories when ambiguous.
 */
function repositoriesForFallback(api: GitAPI, groupId: string): readonly GitRepository[] {
    if (api.repositories.length <= 1) {
        return api.repositories;
    }

    const hintUri =
        vscode.window.activeTextEditor?.document.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;

    if (hintUri) {
        try {
            const hinted = api.getRepository(hintUri);
            if (hinted) {
                return [hinted];
            }
        } catch {
            // Older / partial Git API surfaces may not expose getRepository.
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(hintUri);
        const target = workspaceFolder?.uri ?? hintUri;
        const pathMatched = api.repositories.filter(
            (repository) =>
                sameFsPath(repository.rootUri, target) ||
                target.fsPath
                    .replace(/\\/g, '/')
                    .toLowerCase()
                    .startsWith(`${repository.rootUri.fsPath.replace(/\\/g, '/').toLowerCase()}/`),
        );
        if (pathMatched.length === 1) {
            return pathMatched;
        }
    }

    const withChanges = api.repositories.filter(
        (repository) => changesForGroup(repository, groupId).length > 0,
    );
    if (withChanges.length === 1) {
        return withChanges;
    }

    // Ambiguous multi-root: refuse to combine unrelated repos.
    return [];
}

function gitApiReady(api: GitAPI): boolean {
    return api.state === 'initialized';
}

async function getGitApi(): Promise<GitAPI | undefined> {
    const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!extension) {
        return undefined;
    }

    const exports = extension.isActive ? extension.exports : await extension.activate();
    const api = exports.getAPI(1);
    if (gitApiReady(api)) {
        return api;
    }

    await new Promise<void>((resolve) => {
        if (gitApiReady(api)) {
            resolve();
            return;
        }

        const subscription = api.onDidChangeState(() => {
            if (gitApiReady(api)) {
                cleanup();
                resolve();
            }
        });
        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, GIT_API_WAIT_MS);

        function cleanup(): void {
            clearTimeout(timer);
            subscription.dispose();
        }
    });

    return gitApiReady(api) ? api : undefined;
}

function urisFromGitGroupId(api: GitAPI, groupId: string): vscode.Uri[] {
    const uris: vscode.Uri[] = [];
    for (const repository of repositoriesForFallback(api, groupId)) {
        uris.push(...changesForGroup(repository, groupId).map((change) => change.uri));
    }
    return uris;
}

/**
 * Resolve file URIs for one or more SCM resource groups.
 * Prefers `resourceStates` when VS Code supplies them; otherwise uses the Git extension API
 * (needed when the group is marshalled across extension hosts without states).
 */
export async function urisFromScmResourceGroups(
    groups: readonly vscode.SourceControlResourceGroup[],
): Promise<vscode.Uri[]> {
    const collected: vscode.Uri[] = [];
    let needsGitFallback = false;

    for (const group of groups) {
        const fromStates = urisFromResourceStates(group.resourceStates);
        if (fromStates.length > 0) {
            collected.push(...fromStates);
        } else if (group.id) {
            needsGitFallback = true;
        }
    }

    if (needsGitFallback) {
        const api = await getGitApi();
        if (api) {
            for (const group of groups) {
                if (urisFromResourceStates(group.resourceStates).length > 0) {
                    continue;
                }
                collected.push(...urisFromGitGroupId(api, group.id));
            }
        }
    }

    return dedupeUris(collected);
}

function isResourceState(
    value: vscode.SourceControlResourceState | vscode.SourceControlResourceGroup,
): value is vscode.SourceControlResourceState {
    return 'resourceUri' in value;
}

/** URIs from SCM resource-state / folder menus or resource-group menus. */
export async function urisFromScmMenuArgs(
    ...args: Array<vscode.SourceControlResourceState | vscode.SourceControlResourceGroup>
): Promise<vscode.Uri[]> {
    if (args.length === 0) {
        return [];
    }

    if (isResourceState(args[0])) {
        return dedupeUris(
            args
                .filter(isResourceState)
                .map((state) => state.resourceUri)
                .filter(Boolean),
        );
    }

    return urisFromScmResourceGroups(args as vscode.SourceControlResourceGroup[]);
}
