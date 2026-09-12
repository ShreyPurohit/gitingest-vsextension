import * as assert from 'assert';
import { initialFilterMode } from '../../utils/filterMode';

const options = (include: string[], exclude: string[]) => ({
    includePatterns: include,
    excludePatterns: exclude,
    maxFileSize: 1024,
});

describe('filterMode', () => {
    it('starts in exclude when only exclusions are set', () => {
        assert.strictEqual(initialFilterMode(options([], ['**/node_modules'])), 'exclude');
    });

    it('starts in include when only include patterns are set', () => {
        assert.strictEqual(initialFilterMode(options(['src/**'], [])), 'include');
    });

    it('starts in exclude when both lists have patterns so exclusions stay visible', () => {
        assert.strictEqual(initialFilterMode(options(['src/**'], ['**/node_modules'])), 'exclude');
    });

    it('starts in exclude when both lists are empty', () => {
        assert.strictEqual(initialFilterMode(options([], [])), 'exclude');
    });
});
