import * as assert from 'assert';
import { parseTreeRows, toGlobPattern } from '../../utils/treeParser';

const TREE = [
    'Directory structure:',
    '└── repo/',
    '    ├── src/',
    '    │   ├── services/',
    '    │   │   └── analysisService.ts',
    '    │   └── extension.ts',
    '    ├── LICENSE',
    '    └── README.md',
].join('\n');

describe('treeParser', () => {
    describe('parseTreeRows', () => {
        const rows = parseTreeRows(TREE);

        it('keeps every line, including non-entries', () => {
            assert.strictEqual(rows.length, 8);
            assert.strictEqual(rows[0].text, 'Directory structure:');
            assert.strictEqual(rows[0].path, undefined);
        });

        it('treats the top-level entry as the ingested root', () => {
            assert.strictEqual(rows[1].path, undefined);
            assert.strictEqual(rows[1].isDirectory, true);
        });

        it('builds paths relative to the root', () => {
            assert.strictEqual(rows[2].path, 'src');
            assert.strictEqual(rows[3].path, 'src/services');
            assert.strictEqual(rows[4].path, 'src/services/analysisService.ts');
            assert.strictEqual(rows[5].path, 'src/extension.ts');
        });

        it('pops back out of nested directories on last-child connectors', () => {
            assert.strictEqual(rows[6].path, 'LICENSE');
            assert.strictEqual(rows[7].path, 'README.md');
        });

        it('flags directories by their trailing slash', () => {
            assert.strictEqual(rows[2].isDirectory, true);
            assert.strictEqual(rows[5].isDirectory, false);
        });

        it('handles extensionless files and empty input', () => {
            assert.strictEqual(rows[6].isDirectory, false);
            assert.deepStrictEqual(parseTreeRows(''), [{ text: '', isDirectory: false }]);
        });

        it('returns plain rows for output without tree connectors', () => {
            const plain = parseTreeRows('no tree here');
            assert.deepStrictEqual(plain, [{ text: 'no tree here', isDirectory: false }]);
        });
    });

    describe('toGlobPattern', () => {
        it('matches everything under a directory', () => {
            assert.strictEqual(toGlobPattern('src/services', true), 'src/services/**');
        });

        it('uses the plain path for files', () => {
            assert.strictEqual(toGlobPattern('src/extension.ts', false), 'src/extension.ts');
        });

        it('trims surrounding slashes and ignores empty paths', () => {
            assert.strictEqual(toGlobPattern('/src/', true), 'src/**');
            assert.strictEqual(toGlobPattern('', true), '');
        });
    });
});
