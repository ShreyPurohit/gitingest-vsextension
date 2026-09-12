import * as assert from 'assert';
import * as path from 'path';
import { copyIntoIngest, IngestDirectoryEntry, IngestFileSystem } from '../../utils/ingestCopy';

/**
 * In-memory stand-in for `vscode.workspace.fs`: directories are paths mapped to
 * their children, files are paths mapped to their contents.
 */
class FakeFileSystem implements IngestFileSystem {
    public readonly files = new Map<string, string>();
    public readonly directories = new Set<string>();
    public readonly copies: Array<[string, string]> = [];

    constructor(tree: Record<string, string | null>) {
        for (const [entry, contents] of Object.entries(tree)) {
            const full = path.join(path.sep, entry);
            if (contents === null) {
                this.directories.add(full);
            } else {
                this.files.set(full, contents);
            }
            for (let parent = path.dirname(full); parent !== path.sep;) {
                this.directories.add(parent);
                const next = path.dirname(parent);
                if (next === parent) {
                    break;
                }
                parent = next;
            }
        }
    }

    async exists(targetPath: string): Promise<boolean> {
        return this.files.has(targetPath) || this.directories.has(targetPath);
    }

    async readDirectory(directoryPath: string): Promise<IngestDirectoryEntry[]> {
        const prefix = `${directoryPath}${path.sep}`;
        const names = new Map<string, boolean>();
        for (const entry of [...this.files.keys(), ...this.directories]) {
            if (!entry.startsWith(prefix)) {
                continue;
            }
            const [name] = entry.slice(prefix.length).split(path.sep);
            const child = path.join(directoryPath, name);
            names.set(name, this.directories.has(child));
        }
        return [...names].map(([name, isDirectory]) => ({ name, isDirectory }));
    }

    async createDirectory(directoryPath: string): Promise<void> {
        this.directories.add(directoryPath);
    }

    /** Mirrors `vscode.workspace.fs.copy`: recursive for directories, refuses to overwrite. */
    async copy(sourcePath: string, destinationPath: string): Promise<void> {
        if (await this.exists(destinationPath)) {
            throw new Error(`EEXIST: ${destinationPath}`);
        }
        this.copies.push([sourcePath, destinationPath]);

        const contents = this.files.get(sourcePath);
        if (contents !== undefined) {
            this.files.set(destinationPath, contents);
            return;
        }

        this.directories.add(destinationPath);
        for (const entry of await this.readDirectory(sourcePath)) {
            await this.copy(
                path.join(sourcePath, entry.name),
                path.join(destinationPath, entry.name),
            );
        }
    }
}

const p = (...segments: string[]) => path.join(path.sep, ...segments);

describe('ingestCopy', () => {
    describe('copyIntoIngest', () => {
        it('copies a directory wholesale when the destination is free', async () => {
            const fs = new FakeFileSystem({
                'repo/src/a.ts': 'a',
                'repo/src/nested/b.ts': 'b',
                'repo/ingest': null,
            });

            const destination = await copyIntoIngest(
                fs,
                p('repo', 'src'),
                p('repo', 'ingest'),
                'src',
                true,
            );

            assert.strictEqual(destination, p('repo', 'ingest', 'src'));
            // One wholesale copy of the folder, not a walk of its entries.
            assert.deepStrictEqual(fs.copies[0], [p('repo', 'src'), p('repo', 'ingest', 'src')]);
            assert.strictEqual(fs.files.get(p('repo', 'ingest', 'src', 'nested', 'b.ts')), 'b');
        });

        it('merges into an existing folder instead of creating "src (1)"', async () => {
            const fs = new FakeFileSystem({
                'repo/src/a.ts': 'a',
                'repo/src/b.ts': 'b',
                'repo/ingest/src/a.ts': 'a',
            });

            const destination = await copyIntoIngest(
                fs,
                p('repo', 'src'),
                p('repo', 'ingest'),
                'src',
                true,
            );

            assert.strictEqual(destination, p('repo', 'ingest', 'src'));
            assert.ok(!(await fs.exists(p('repo', 'ingest', 'src (1)'))));
            assert.strictEqual(fs.files.get(p('repo', 'ingest', 'src', 'b.ts')), 'b');
            // The existing folder is filled entry by entry, never copied over as a whole.
            assert.ok(
                !fs.copies.some(([, target]) => target === p('repo', 'ingest', 'src')),
                'the existing destination folder must not be copied onto',
            );
            // The colliding file is kept beside the staged one rather than overwritten.
            assert.strictEqual(fs.files.get(p('repo', 'ingest', 'src', 'a (1).ts')), 'a');
        });

        it('merges nested directories too', async () => {
            const fs = new FakeFileSystem({
                'repo/src/utils/a.ts': 'a',
                'repo/src/utils/b.ts': 'b',
                'repo/ingest/src/utils/a.ts': 'a',
            });

            await copyIntoIngest(fs, p('repo', 'src'), p('repo', 'ingest'), 'src', true);

            assert.strictEqual(fs.files.get(p('repo', 'ingest', 'src', 'utils', 'b.ts')), 'b');
            assert.ok(!(await fs.exists(p('repo', 'ingest', 'src', 'utils (1)'))));
        });

        it('suffixes a file that would overwrite an existing one', async () => {
            const fs = new FakeFileSystem({
                'repo/a.ts': 'new',
                'repo/ingest/a.ts': 'old',
            });

            const destination = await copyIntoIngest(
                fs,
                p('repo', 'a.ts'),
                p('repo', 'ingest'),
                'a.ts',
                false,
            );

            assert.strictEqual(destination, p('repo', 'ingest', 'a (1).ts'));
            assert.strictEqual(fs.files.get(p('repo', 'ingest', 'a.ts')), 'old');
            assert.strictEqual(fs.files.get(p('repo', 'ingest', 'a (1).ts')), 'new');
        });

        it('keeps counting up when several copies already exist', async () => {
            const fs = new FakeFileSystem({
                'repo/a.ts': 'new',
                'repo/ingest/a.ts': 'old',
                'repo/ingest/a (1).ts': 'older',
            });

            const destination = await copyIntoIngest(
                fs,
                p('repo', 'a.ts'),
                p('repo', 'ingest'),
                'a.ts',
                false,
            );

            assert.strictEqual(destination, p('repo', 'ingest', 'a (2).ts'));
        });

        it('suffixes extensionless files without inventing an extension', async () => {
            const fs = new FakeFileSystem({
                'repo/LICENSE': 'new',
                'repo/ingest/LICENSE': 'old',
            });

            const destination = await copyIntoIngest(
                fs,
                p('repo', 'LICENSE'),
                p('repo', 'ingest'),
                'LICENSE',
                false,
            );

            assert.strictEqual(destination, p('repo', 'ingest', 'LICENSE (1)'));
        });
    });
});
