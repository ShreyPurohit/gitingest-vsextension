import * as assert from 'assert';
import * as path from 'path';
import { isSameOrChild, resolveIngestDestination } from '../../utils/ingestPaths';

const root = path.join(path.sep, 'workspace', 'repo');
const p = (...segments: string[]) => path.join(root, ...segments);

describe('ingestPaths', () => {
    describe('isSameOrChild', () => {
        it('accepts the base path itself and its descendants', () => {
            assert.strictEqual(isSameOrChild(root, root), true);
            assert.strictEqual(isSameOrChild(root, p('src', 'a.ts')), true);
        });

        it('rejects siblings and parents', () => {
            assert.strictEqual(
                isSameOrChild(root, path.join(path.sep, 'workspace', 'other')),
                false,
            );
            assert.strictEqual(isSameOrChild(p('src'), root), false);
        });
    });

    describe('resolveIngestDestination', () => {
        it('mirrors the relative path of a nested file', () => {
            const result = resolveIngestDestination(root, p('src', 'utils', 'example.ts'), true);
            assert.deepStrictEqual(result.segments, ['src', 'utils', 'example.ts']);
            assert.strictEqual(result.relativePath, 'src/utils/example.ts');
        });

        it('keeps top-level items at the ingest root', () => {
            const result = resolveIngestDestination(root, p('README.md'), true);
            assert.deepStrictEqual(result.segments, ['README.md']);
            assert.strictEqual(result.relativePath, 'README.md');
        });

        it('mirrors directories the same way as files', () => {
            const result = resolveIngestDestination(root, p('src', 'services'), true);
            assert.deepStrictEqual(result.segments, ['src', 'services']);
        });

        it('falls back to the leaf name when structure is not preserved', () => {
            const result = resolveIngestDestination(root, p('src', 'utils', 'example.ts'), false);
            assert.deepStrictEqual(result.segments, ['example.ts']);
            assert.strictEqual(result.relativePath, 'src/utils/example.ts');
        });

        it('normalizes redundant segments before mapping', () => {
            const result = resolveIngestDestination(
                root,
                p('src', 'utils', '..', 'services', 'a.ts'),
                true,
            );
            assert.deepStrictEqual(result.segments, ['src', 'services', 'a.ts']);
        });

        it('rejects resources outside the workspace root', () => {
            assert.throws(
                () =>
                    resolveIngestDestination(root, path.join(path.sep, 'elsewhere', 'a.ts'), true),
                /inside the workspace root/,
            );
        });

        it('rejects the workspace root itself', () => {
            assert.throws(
                () => resolveIngestDestination(root, root, true),
                /inside the workspace root/,
            );
        });
    });
});
