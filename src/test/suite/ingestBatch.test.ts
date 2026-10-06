import * as assert from 'assert';
import { resolveIngestBatchOutcome } from '../../utils/ingestBatch';

describe('ingestBatch', () => {
    it('reports when every resource was already staged', () => {
        const outcome = resolveIngestBatchOutcome({ added: 0, skipped: 3, failed: 0 });
        assert.strictEqual(outcome.type, 'all-skipped');
        assert.match(outcome.message, /already in the ingest folder/);
    });

    it('reports total failure when nothing was added', () => {
        const outcome = resolveIngestBatchOutcome({ added: 0, skipped: 0, failed: 2 });
        assert.strictEqual(outcome.type, 'all-failed');
        assert.strictEqual(outcome.message, 'Failed to add 2 items to ingest.');
    });

    it('summarizes mixed success with skips and failures', () => {
        const outcome = resolveIngestBatchOutcome({ added: 4, skipped: 1, failed: 2 });
        assert.strictEqual(outcome.type, 'summary');
        assert.strictEqual(outcome.message, 'Added 4 items to ingest; 1 already staged; 2 failed.');
    });

    it('uses singular wording for one added item', () => {
        const outcome = resolveIngestBatchOutcome({ added: 1, skipped: 0, failed: 0 });
        assert.strictEqual(outcome.type, 'summary');
        assert.strictEqual(outcome.message, 'Added 1 item to ingest.');
    });
});
