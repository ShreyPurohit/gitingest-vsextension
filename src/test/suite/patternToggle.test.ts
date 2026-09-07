import * as assert from 'assert';
import { DEFAULT_MAX_FILE_SIZE } from '../../config';
import { IngestOptions } from '../../types';
import { togglePattern } from '../../utils/patternToggle';

const options = (includePatterns: string[], excludePatterns: string[]): IngestOptions => ({
    includePatterns,
    excludePatterns,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
});

describe('patternToggle', () => {
    it('adds the entry to the active list', () => {
        const excluded = togglePattern(options([], []), 'src/**', 'exclude');
        assert.deepStrictEqual(excluded.excludePatterns, ['src/**']);
        assert.deepStrictEqual(excluded.includePatterns, []);

        const included = togglePattern(options([], []), 'src/**', 'include');
        assert.deepStrictEqual(included.includePatterns, ['src/**']);
        assert.deepStrictEqual(included.excludePatterns, []);
    });

    it('removes the entry when it is already set, so a second click undoes the first', () => {
        const start = options([], ['**/node_modules']);
        const once = togglePattern(start, 'src/**', 'exclude');
        const twice = togglePattern(once, 'src/**', 'exclude');
        assert.deepStrictEqual(twice.excludePatterns, ['**/node_modules']);
        assert.deepStrictEqual(twice.includePatterns, []);
    });

    it('moves an entry across when the mode changed, never leaving it in both', () => {
        const excluded = togglePattern(options([], []), 'src/**', 'exclude');
        const included = togglePattern(excluded, 'src/**', 'include');
        assert.deepStrictEqual(included.includePatterns, ['src/**']);
        assert.deepStrictEqual(included.excludePatterns, []);
    });

    it('never leaves a pattern in both lists across repeated toggles', () => {
        let state = options([], []);
        const modes = ['exclude', 'include', 'include', 'exclude', 'exclude'] as const;
        for (const mode of modes) {
            state = togglePattern(state, 'src/**', mode);
            const inBoth =
                state.includePatterns.includes('src/**') &&
                state.excludePatterns.includes('src/**');
            assert.strictEqual(inBoth, false, `pattern is in both lists after ${mode}`);
        }
    });

    it('keeps unrelated patterns and the size limit untouched', () => {
        const result = togglePattern(
            options(['docs/**'], ['**/node_modules']),
            'src/**',
            'exclude',
        );
        assert.deepStrictEqual(result.includePatterns, ['docs/**']);
        assert.deepStrictEqual(result.excludePatterns, ['**/node_modules', 'src/**']);
        assert.strictEqual(result.maxFileSize, DEFAULT_MAX_FILE_SIZE);
    });

    it('does not duplicate an entry that is already set', () => {
        const result = togglePattern(options([], ['src/**']), 'src/**', 'include');
        assert.deepStrictEqual(result.includePatterns, ['src/**']);
        assert.deepStrictEqual(result.excludePatterns, []);
    });

    it('ignores a blank pattern', () => {
        const start = options(['src/**'], []);
        assert.strictEqual(togglePattern(start, '   ', 'exclude'), start);
    });
});
