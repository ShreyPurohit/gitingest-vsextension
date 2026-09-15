import * as assert from 'assert';
import {
    STAGING_DELETED_AFTER_INGEST_REASON,
    reIngestUnavailableAfterCleanup,
} from '../../utils/reIngestAvailability';

describe('reIngestAvailability', () => {
    it('blocks only when the staging root was analyzed and then deleted', () => {
        assert.strictEqual(
            reIngestUnavailableAfterCleanup({
                analyzedTrackedIngestRoot: true,
                cleanupDeleted: true,
            }),
            STAGING_DELETED_AFTER_INGEST_REASON,
        );
    });

    it('stays available when a normal folder was analyzed', () => {
        assert.strictEqual(
            reIngestUnavailableAfterCleanup({
                analyzedTrackedIngestRoot: false,
                cleanupDeleted: true,
            }),
            undefined,
        );
    });

    it('stays available when staging was analyzed but not deleted', () => {
        assert.strictEqual(
            reIngestUnavailableAfterCleanup({
                analyzedTrackedIngestRoot: true,
                cleanupDeleted: false,
            }),
            undefined,
        );
    });
});
