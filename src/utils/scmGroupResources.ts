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
}

interface GitRepository {
    rootUri: vscode.Uri;
    state: {
        workingTreeChanges: readonly { uri: vscode.Uri }[];
        indexChanges: readonly { uri: vscode.Uri }[];
        mergeChanges: readonly { uri: vscode.Uri }[];
        untrackedChanges?: readonly { uri: vscode.Uri }[];
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

/**
 * Prefer the repo for the active editor / first workspace folder so multi-root
 * workspaces do not stage every repository's Changes group.
 */
function repositoriesForFallback(api: GitAPI): readonly GitRepository[] {
    if (api.repositories.length <= 1) {
        return api.repositories;
    }

    const hintUri =
        vscode.window.activeTextEditor?.document.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!hintUri) {
        return api.repositories;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(hintUri);
    const target = workspaceFolder?.uri ?? hintUri;
    const matched = api.repositories.filter(
        (repository) =>
            sameFsPath(repository.rootUri, target) ||
            target.fsPath
                .replace(/\\/g, '/')
                .toLowerCase()
                .startsWith(`${repository.rootUri.fsPath.replace(/\\/g, '/').toLowerCase()}/`),
    );

    return matched.length > 0 ? matched : api.repositories;
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

/** Map built-in Git resource-group ids to repository change lists. */
function urisFromGitGroupId(api: GitAPI, groupId: string): vscode.Uri[] {
    const uris: vscode.Uri[] = [];
    for (const repository of repositoriesForFallback(api)) {
        const { state } = repository;
        switch (groupId) {
            case 'workingTree':
                uris.push(...state.workingTreeChanges.map((change) => change.uri));
                break;
            case 'index':
                uris.push(...state.indexChanges.map((change) => change.uri));
                break;
            case 'merge':
                uris.push(...state.mergeChanges.map((change) => change.uri));
                break;
            case 'untracked':
                uris.push(...(state.untrackedChanges ?? []).map((change) => change.uri));
                break;
            default:
                break;
        }
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
