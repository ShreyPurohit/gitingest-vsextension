import * as assert from 'assert';
import { parseSummaryStats } from '../../utils/summaryStats';

describe('summaryStats', () => {
    it('reads the key/value facts of a directory summary', () => {
        const stats = parseSummaryStats(
            'Directory: repo\nFiles analyzed: 42\nEstimated tokens: 12.3k',
        );
        assert.deepStrictEqual(stats, [
            { label: 'Directory', value: 'repo' },
            { label: 'Files analyzed', value: '42' },
            { label: 'Estimated tokens', value: '12.3k' },
        ]);
    });

    it('skips lines that are not facts', () => {
        const stats = parseSummaryStats('Repository: owner/name\n\nsome prose\nBranch: main');
        assert.deepStrictEqual(stats, [
            { label: 'Repository', value: 'owner/name' },
            { label: 'Branch', value: 'main' },
        ]);
    });

    it('returns nothing for an unparseable summary', () => {
        assert.deepStrictEqual(parseSummaryStats('just a sentence'), []);
        assert.deepStrictEqual(parseSummaryStats(''), []);
    });

    it('caps the number of chips', () => {
        const summary = Array.from({ length: 10 }, (_, i) => `Key ${i}: ${i}`).join('\n');
        assert.strictEqual(parseSummaryStats(summary).length, 6);
    });
});
