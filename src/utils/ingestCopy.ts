import * as path from 'path';

/** One entry of a directory listing. */
export interface IngestDirectoryEntry {
    name: string;
    isDirectory: boolean;
}

/**
 * The filesystem operations staging needs. `WorkspaceService` backs this with
 * `vscode.workspace.fs`; tests back it with an in-memory fake.
 */
export interface IngestFileSystem {
    exists(targetPath: string): Promise<boolean>;
    readDirectory(directoryPath: string): Promise<IngestDirectoryEntry[]>;
    createDirectory(directoryPath: string): Promise<void>;
    copy(sourcePath: string, destinationPath: string): Promise<void>;
}

/**
 * First free name for `name` under `parent`, adding " (1)", " (2)", … before the
 * extension of a file. Used so staging a changed file twice keeps both copies.
 */
export async function findFreeName(
    fs: IngestFileSystem,
    parent: string,
    name: string,
    kind: 'file' | 'directory',
): Promise<string> {
    const parsed = path.parse(name);
    const baseName = parsed.name || parsed.base; // parsed.base covers names like '..'
    const extension = kind === 'file' ? parsed.ext : '';
    let attempt = 0;

    while (true) {
        const candidateName =
            attempt === 0
                ? name
                : extension && kind === 'file'
                  ? `${baseName} (${attempt})${extension}`
                  : `${baseName} (${attempt})`;
        const candidate = path.join(parent, candidateName);
        if (!(await fs.exists(candidate))) {
            return candidate;
        }
        attempt += 1;
    }
}

/**
 * Copy a resource into the ingest folder, returning where it landed.
 *
 * Directories are merged into an existing folder of the same name - staging
 * `src/a.ts` and then `src/` should fill one mirrored tree, not leave a second
 * `src (1)` beside it - while a file that would overwrite an existing one keeps
 * the " (1)" suffix, since overwriting would silently drop its contents.
 */
export async function copyIntoIngest(
    fs: IngestFileSystem,
    source: string,
    destinationParent: string,
    name: string,
    isDirectory: boolean,
): Promise<string> {
    if (!isDirectory) {
        const destination = await findFreeName(fs, destinationParent, name, 'file');
        await fs.copy(source, destination);
        return destination;
    }

    const destination = path.join(destinationParent, name);
    if (!(await fs.exists(destination))) {
        await fs.copy(source, destination);
        return destination;
    }

    await fs.createDirectory(destination);
    for (const entry of await fs.readDirectory(source)) {
        await copyIntoIngest(
            fs,
            path.join(source, entry.name),
            destination,
            entry.name,
            entry.isDirectory,
        );
    }
    return destination;
}
