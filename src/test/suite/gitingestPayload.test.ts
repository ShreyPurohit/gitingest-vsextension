import * as assert from 'assert';
import { extractGitingestJsonPayload } from '../../utils/gitingestPayload';

describe('gitingestPayload', () => {
    it('extracts JSON between markers when stdout also has logs', () => {
        const output = [
            'gitingest.entrypoint:ingest_async:89 | Starting ingestion process',
            '__GITINGEST_JSON_START__',
            '{"summary":"ok","tree":"t","content":"c"}',
            '__GITINGEST_JSON_END__',
            '',
        ].join('\n');

        const payload = extractGitingestJsonPayload(output);
        assert.deepStrictEqual(JSON.parse(payload), {
            summary: 'ok',
            tree: 't',
            content: 'c',
        });
    });

    it('does not truncate when the digest body quotes the end marker', () => {
        // Analyzing this repo embeds the marker string inside `content`.
        const body = JSON.stringify({
            summary: 's',
            tree: 't',
            content: 'see __GITINGEST_JSON_END__ in analysisService',
        });
        const output = `__GITINGEST_JSON_START__\n${body}\n__GITINGEST_JSON_END__\n`;

        const payload = extractGitingestJsonPayload(output);
        assert.deepStrictEqual(JSON.parse(payload), {
            summary: 's',
            tree: 't',
            content: 'see __GITINGEST_JSON_END__ in analysisService',
        });
    });

    it('throws when markers are missing', () => {
        assert.throws(
            () => extractGitingestJsonPayload('no markers here'),
            /recognizable result payload/,
        );
    });
});
