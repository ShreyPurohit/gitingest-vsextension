import * as assert from 'assert';
import { DEFAULT_MAX_FILE_SIZE } from '../../config';
import { ResultFilters } from '../../types';
import { getResultsContent } from '../../webview';

const data = {
    summary: 'Files analyzed: 3',
    tree: ['Directory structure:', '└── repo/', '    └── src/', '        └── a.ts'].join('\n'),
    content: 'FILE: src/a.ts\nexport const a = 1;',
};

const filters: ResultFilters = {
    applied: {
        includePatterns: ['src/**'],
        excludePatterns: ['**/node_modules'],
        maxFileSize: 51200,
    },
    defaults: {
        includePatterns: [],
        excludePatterns: ['**/node_modules', '**/.git'],
        maxFileSize: DEFAULT_MAX_FILE_SIZE,
    },
};

describe('webview results', () => {
    it('renders the filter row in the gitingest.com shape', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(html.includes('id="gi-mode"'), 'include/exclude mode select');
        assert.ok(html.includes('id="gi-patterns"'), 'single pattern field');
        assert.ok(html.includes('type="range"'), 'size slider');
        assert.ok(html.includes('Include files under:'));
        assert.ok(!html.includes('id="gi-include"'), 'no separate include textarea');
        assert.ok(!html.includes('type="number"'), 'no raw byte input');
    });

    it('starts in the mode the applied filters imply and carries the other list along', () => {
        const including = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(including.includes('data-mode="include"'));
        assert.ok(including.includes('value="src/**"'), 'the include list is shown');
        assert.ok(including.includes('data-exclude="**/node_modules"'), 'excludes are kept');

        const excluding = getResultsContent(data, '/workspace/repo', {
            ...filters,
            applied: { ...filters.applied, includePatterns: [] },
        });
        assert.ok(excluding.includes('data-mode="exclude"'));
        assert.ok(excluding.includes('value="**/node_modules"'), 'the exclude list is shown');
    });

    it('places the slider on the stop matching the applied size', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        // 51200 bytes is the 50 kB stop, index 5.
        assert.ok(html.includes('id="gi-size" type="range" min="0" max="15" step="1" value="5"'));
        assert.ok(html.includes('>50 kB</strong>'));
    });

    it('offers Reset to Settings seeded from the configured values', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(html.includes('data-default-exclude="**/node_modules, **/.git"'));
        assert.ok(html.includes('onclick="resetFilters()"'));
    });

    it('styles the filter controls with the shared panel components', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        assert.strictEqual(
            (html.match(/class="button primary-button"/g) ?? []).length >= 2,
            true,
            'Re-Ingest and Reset use the shared Button component',
        );
        assert.ok(!html.includes('link-button'));
        assert.ok(!html.includes('filter-input'));
    });

    it('falls back to the plain Re-Ingest button when no filters are provided', () => {
        const html = getResultsContent(data, '/workspace/repo');
        assert.ok(!html.includes('id="gi-filters"'));
        assert.ok(html.includes('Re-Ingest'));
        assert.ok(html.includes('data-path="/workspace/repo"'));
    });

    it('escapes analysis output', () => {
        const html = getResultsContent(
            { ...data, content: '<script>alert(1)</script>' },
            '/workspace/repo',
            filters,
        );
        assert.ok(!html.includes('<script>alert(1)</script>'));
        assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    });
});
