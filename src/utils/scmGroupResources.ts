import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { OsUtils } from './osUtils';

const GIT_API_WAIT_MS = 5_000;

/**
 * Porcelain commands equivalent to each built-in SCM group, run in the repo root.
 * This is the universal escape hatch: it depends on git-the-binary (present on any
 * machine with a git repo), not git-the-extension, so it works on every editor.
 */
const GIT_CLI_FOR_GROUP: Record<string, readonly (readonly string[])[]> = {
    workingTree: [['diff', '--name-only']],
    index: [['diff', '--cached', '--name-only']],
    untracked: [['ls-files', '--others', '--exclude-standard']],
    merge: [['diff', '--name-only', '--diff-filter=U']],
};

/**
 * Editor-agnostic superset: every changed path git knows about (staged, unstaged,
 * merge-conflict, untracked). Used when a group's `id` is NOT one of the known
 * VS Code ids — e.g. a Code-OSS fork (Kiro, VSCodium) that names its SCM groups
 * differently. Resolving "all changes" is a safe superset for a group-level ingest
 * and keeps the CLI tier free of any editor-specific group identifier.
 */
const GIT_CLI_ALL_CHANGES: readonly (readonly string[])[] = [
    ['diff', '--name-only'],
    ['diff', '--cached', '--name-only'],
    ['diff', '--name-only', '--diff-filter=U'],
    ['ls-files', '--others', '--exclude-standard'],
];

const GIT_CLI_TIMEOUT_MS = 10_000;

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
        OsUtils.toPosixPath(left.fsPath).toLowerCase() ===
        OsUtils.toPosixPath(right.fsPath).toLowerCase()
    );
}

function fsPathKey(fsPath: string): string {
    return OsUtils.toPosixPath(fsPath).toLowerCase();
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

function hasGitApiExport(value: unknown): value is GitExtension {
    return typeof (value as { getAPI?: unknown } | undefined)?.getAPI === 'function';
}

/**
 * Find the built-in Git extension WITHOUT hard-coding an editor-specific id.
 * VSCode/Cursor publish it as `vscode.git`; Code-OSS forks (Kiro, VSCodium, …)
 * may use a different id. Try the conventional id, then discover any extension
 * whose id ends in `git` — activate inactive candidates before checking exports
 * (inactive forks often have `exports === undefined`).
 */
async function findGitExtension(): Promise<vscode.Extension<GitExtension> | undefined> {
    const direct = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (direct) {
        return direct;
    }

    for (const candidate of vscode.extensions.all) {
        if (!/(^|[.-])git$/i.test(candidate.id)) {
            continue;
        }
        try {
            const exports = candidate.isActive ? candidate.exports : await candidate.activate();
            if (hasGitApiExport(exports)) {
                return candidate as vscode.Extension<GitExtension>;
            }
        } catch {
            // Keep scanning — a broken/mis-matched *git extension should not abort discovery.
        }
    }

    return undefined;
}

async function getGitApi(): Promise<GitAPI | undefined> {
    const extension = await findGitExtension();
    if (!extension) {
        return undefined;
    }

    const exports = extension.isActive ? extension.exports : await extension.activate();
    if (!hasGitApiExport(exports)) {
        return undefined;
    }
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
 * Distinct ancestor folders of a changed-file set, as workspace-relative POSIX
 * paths, nearest-root first. Used to build the folder picker shown when the editor
 * gave us only a whole group (no clicked-item scope). Each returned path, passed
 * back to `filterUrisUnderRelativeFolder`, narrows the set to that subtree.
 */
export function changedFolderChoices(uris: readonly vscode.Uri[]): string[] {
    const folders = new Set<string>();
    for (const uri of uris) {
        const rel = OsUtils.toPosixPath(vscode.workspace.asRelativePath(uri, false));
        if (!rel || rel.startsWith('..') || rel === uri.fsPath) {
            continue;
        }
        const segments = rel.split('/');
        // Every ancestor directory of the file (drop the filename), accumulating.
        for (let i = 1; i < segments.length; i += 1) {
            folders.add(segments.slice(0, i).join('/'));
        }
    }
    return [...folders].sort((a, b) => a.localeCompare(b));
}

/** Narrow a URI set to those under a workspace-relative POSIX folder path. */
export function filterUrisUnderRelativeFolder(
    uris: readonly vscode.Uri[],
    relativeFolder: string,
): vscode.Uri[] {
    const folder = OsUtils.toPosixPath(relativeFolder).replace(/\/+$/, '');
    const prefix = `${folder}/`;
    return uris.filter((uri) => {
        const rel = OsUtils.toPosixPath(vscode.workspace.asRelativePath(uri, false));
        return rel === folder || rel.startsWith(prefix);
    });
}

/**
 * Run `git` with the given args in `cwd`, returning trimmed stdout lines.
 * Resolves to an empty array on any failure (git missing, not a repo, non-zero exit).
 * No shell: args are passed directly, so paths with spaces are safe.
 */
function runGit(args: readonly string[], cwd: string): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
        let settled = false;
        const done = (lines: string[]): void => {
            if (!settled) {
                settled = true;
                resolve(lines);
            }
        };

        let stdout = '';
        const child = spawn('git', [...args], { cwd, shell: false });
        const timer = setTimeout(() => {
            child.kill();
            done([]);
        }, GIT_CLI_TIMEOUT_MS);

        child.stdout?.setEncoding('utf8');
        child.stdout?.on('data', (chunk: string) => {
            stdout += chunk;
        });
        child.on('error', () => {
            clearTimeout(timer);
            done([]);
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                done([]);
                return;
            }
            done(
                stdout
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0),
            );
        });
    });
}

/**
 * Candidate repository roots to probe with the CLI, derived from the SCM groups'
 * own source-control root when available, else the active editor / workspace folders.
 * Deduped by fs path.
 */
function candidateRepoRoots(groups: readonly vscode.SourceControlResourceGroup[]): string[] {
    const roots: string[] = [];
    const seen = new Set<string>();
    const add = (uri: vscode.Uri | undefined): void => {
        if (!uri) {
            return;
        }
        const key = fsPathKey(uri.fsPath);
        if (!seen.has(key)) {
            seen.add(key);
            roots.push(uri.fsPath);
        }
    };

    for (const group of groups) {
        // `rootUri` is exposed by the SourceControl that owns the group on most providers.
        const owner = (group as { sourceControl?: { rootUri?: vscode.Uri } }).sourceControl;
        add(owner?.rootUri);
    }
    add(vscode.window.activeTextEditor?.document.uri);
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        add(folder.uri);
    }

    return roots;
}

/**
 * Tier B fallback: resolve a group's files with the `git` CLI when the Git
 * extension API is absent OR returns nothing (an editor that ships SCM without
 * the API, or one whose group ids the API path doesn't recognise). Resolves a
 * single repo root via `git rev-parse --show-toplevel` and refuses when more
 * than one distinct root is found (same multi-root safety as the API path).
 * Depends only on git-the-binary, so it is fully editor-agnostic.
 */
async function urisFromGitCliGroups(
    groups: readonly vscode.SourceControlResourceGroup[],
): Promise<vscode.Uri[]> {
    // Groups with no marshalled states need the CLI. Each maps to its known
    // query set, or to the all-changes superset when the id is unrecognised
    // (a non-VS Code SCM provider). Dedupe the query sets so we don't run the
    // same `git` command twice when several unknown groups all fall through.
    const querySets: (readonly (readonly string[])[])[] = [];
    for (const group of groups) {
        if (urisFromResourceStates(group.resourceStates).length > 0) {
            continue;
        }
        querySets.push(GIT_CLI_FOR_GROUP[group.id] ?? GIT_CLI_ALL_CHANGES);
    }
    if (querySets.length === 0) {
        return [];
    }

    const commands = dedupeCommands(querySets.flat());

    const tops: string[] = [];
    const seenTops = new Set<string>();
    for (const candidate of candidateRepoRoots(groups)) {
        const [top] = await runGit(['rev-parse', '--show-toplevel'], candidate);
        if (!top) {
            continue;
        }
        const key = fsPathKey(top);
        if (!seenTops.has(key)) {
            seenTops.add(key);
            tops.push(top);
        }
    }

    // Ambiguous multi-root: refuse to combine unrelated repos.
    if (tops.length !== 1) {
        return [];
    }

    const top = tops[0];
    const uris: vscode.Uri[] = [];
    for (const command of commands) {
        const relPaths = await runGit(command, top);
        for (const rel of relPaths) {
            uris.push(vscode.Uri.file(path.join(top, rel)));
        }
    }
    return uris;
}

/** Dedupe git argument vectors by their joined form, preserving order. */
function dedupeCommands(commands: readonly (readonly string[])[]): (readonly string[])[] {
    const seen = new Set<string>();
    const result: (readonly string[])[] = [];
    for (const command of commands) {
        const key = command.join('\u0000');
        if (!seen.has(key)) {
            seen.add(key);
            result.push(command);
        }
    }
    return result;
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
        } else {
            // No marshalled states: this group needs the Git-API / CLI fallback.
            // Trigger it even when `group.id` is empty — a non-VS Code SCM provider
            // may omit or rename it, and the CLI tier resolves "all changes" anyway.
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

        // Tier B: no Git extension API resolved the groups — fall back to the git CLI.
        if (collected.length === 0) {
            collected.push(...(await urisFromGitCliGroups(groups)));
        }
    }

    return dedupeUris(collected);
}

function isResourceState(
    value: vscode.SourceControlResourceState | vscode.SourceControlResourceGroup,
): value is vscode.SourceControlResourceState {
    return 'resourceUri' in value;
}

/**
 * A real SCM group (Changes / Staged / …) exposes id + label + resourceStates.
 * Un-revived marshalled handles (`$mid: 3`, groupHandle/handle only — Kiro) do not.
 */
function isResourceGroup(
    value: vscode.SourceControlResourceState | vscode.SourceControlResourceGroup,
): value is vscode.SourceControlResourceGroup {
    return 'id' in value && 'label' in value && 'resourceStates' in value;
}

/** URIs from SCM resource-state / folder menus or resource-group menus. */
export async function urisFromScmMenuArgs(
    ...args: Array<vscode.SourceControlResourceState | vscode.SourceControlResourceGroup>
): Promise<vscode.Uri[]> {
    const { uris } = await resolveScmSelection(...args);
    return uris;
}

/**
 * Resolve an SCM menu selection AND report whether a precise item scope was applied.
 *
 * `scopeResolved` is true when:
 * - the clicked file/folder carried its own URI(s) (resource-state path), or
 * - the user intentionally clicked a resource **group** header (whole group is the scope).
 *
 * It is false when the editor passed only an un-revived marshalled handle (e.g. Kiro —
 * docs/KIRO-SCM-BUG.md) and we had to resolve a best-effort change set via the Git API /
 * CLI: then the caller offers a folder QuickPick instead of guessing the clicked item.
 */
export async function resolveScmSelection(
    ...args: Array<vscode.SourceControlResourceState | vscode.SourceControlResourceGroup>
): Promise<{ uris: vscode.Uri[]; scopeResolved: boolean }> {
    if (args.length === 0) {
        return { uris: [], scopeResolved: false };
    }

    if (isResourceState(args[0])) {
        const fromStates = dedupeUris(
            args
                .filter(isResourceState)
                .map((state) => state.resourceUri)
                .filter(Boolean),
        );
        if (fromStates.length > 0) {
            return { uris: fromStates, scopeResolved: true };
        }
    }

    // Intentional group-header click (Changes / Staged / …): whole group is the scope.
    if (args.every(isResourceGroup)) {
        return {
            uris: await urisFromScmResourceGroups(args),
            scopeResolved: true,
        };
    }

    // Opaque / un-revived handle — resolve best-effort; caller may QuickPick.
    const uris = await urisFromScmResourceGroups(args as vscode.SourceControlResourceGroup[]);
    return { uris, scopeResolved: false };
}
