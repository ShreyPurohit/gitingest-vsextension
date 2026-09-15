import * as assert from 'assert';
import { DEFAULT_MAX_FILE_SIZE } from '../../config';
import { ResultFilters } from '../../types';
import { getErrorContent, getResultsContent } from '../../webview';

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

    it('starts in include only when that list alone has patterns', () => {
        const includingOnly = getResultsContent(data, '/workspace/repo', {
            ...filters,
            applied: { ...filters.applied, excludePatterns: [] },
        });
        assert.ok(includingOnly.includes('data-mode="include"'));
        assert.ok(includingOnly.includes('value="src/**"'), 'the include list is shown');

        const both = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(
            both.includes('data-mode="exclude"'),
            'exclusions stay visible when both lists are set',
        );
        assert.ok(both.includes('value="**/node_modules"'), 'the exclude list is shown');
        assert.ok(both.includes('data-include="src/**"'), 'includes are kept in panel data');

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

    it('disables Re-Ingest with a hover reason when staging was deleted after ingest', () => {
        const reason = 'Staging folder was deleted after ingest. Add files again to re-run.';
        const html = getResultsContent(data, '/workspace/gitingest-ingest', {
            ...filters,
            reIngestUnavailableReason: reason,
        });
        assert.ok(html.includes('disabled'));
        assert.ok(html.includes('aria-disabled="true"'));
        assert.ok(html.includes(`title="${reason}"`));
        assert.ok(html.includes('data-reingest-blocked="true"'));
        assert.ok(!html.includes('onclick="reIngest()"'), 'disabled button has no click handler');
    });

    it('renders tree entries as clickable rows instead of extra buttons', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(html.includes('class="tree-line tree-entry'));
        assert.ok(html.includes('onclick="toggleEntry(this)"'));
        assert.ok(html.includes('data-pattern="src/**"'));
        assert.ok(html.includes('data-pattern="src/a.ts"'));
        assert.ok(!html.includes('tree-action'), 'no + / - buttons');
    });

    it('strikes entries that are excluded and highlights included ones', () => {
        const html = getResultsContent(data, '/workspace/repo', {
            ...filters,
            applied: {
                ...filters.applied,
                includePatterns: ['src/**'],
                excludePatterns: ['src/a.ts'],
            },
        });
        const included = html.match(
            /class="tree-line tree-entry[^"]*"[^>]*data-pattern="src\/\*\*"/,
        );
        const excluded = html.match(
            /class="tree-line tree-entry[^"]*"[^>]*data-pattern="src\/a\.ts"/,
        );
        assert.ok(included?.[0].includes('is-included'));
        assert.ok(excluded?.[0].includes('is-excluded'));
        assert.ok(html.includes('.tree-entry.is-excluded {text-decoration: line-through'));
    });

    it('leaves the digest in the extension instead of duplicating it in the DOM', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(!html.includes('data-raw'));
        assert.ok(html.includes("command: 'copy', section: section"));
        assert.ok(html.includes("vscode.postMessage({ command: 'saveToFile' })"));
    });

    it('falls back to plain text when the tree is not in the expected format', () => {
        const html = getResultsContent(
            { ...data, tree: 'no tree here' },
            '/workspace/repo',
            filters,
        );
        assert.ok(!html.includes('class="tree"'));
        assert.ok(html.includes('<pre>no tree here</pre>'));
    });

    it('offers an open-in-editor action', () => {
        const html = getResultsContent(data, '/workspace/repo', filters);
        assert.ok(html.includes('openInEditor()'));
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

    it('escapes error titles and messages', () => {
        const html = getErrorContent('Failed <b>run</b>', ['path <script>x</script>']);
        assert.ok(html.includes('Failed &lt;b&gt;run&lt;/b&gt;'));
        assert.ok(html.includes('path &lt;script&gt;x&lt;/script&gt;'));
        assert.ok(!html.includes('<script>x</script>'));
    });
});
