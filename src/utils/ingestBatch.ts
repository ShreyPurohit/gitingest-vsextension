import { IngestBatchCounts, IngestBatchOutcome } from '../types';

/** Build the user-facing result for a multi-resource Add to Ingest run. */
export function resolveIngestBatchOutcome(counts: IngestBatchCounts): IngestBatchOutcome {
    const { added, skipped, failed } = counts;

    if (added === 0 && failed === 0) {
        return {
            type: 'all-skipped',
            message: 'Selected resources are already in the ingest folder.',
        };
    }

    if (failed > 0 && added === 0) {
        return {
            type: 'all-failed',
            message: `Failed to add ${failed} item${failed === 1 ? '' : 's'} to ingest.`,
        };
    }

    const parts = [`Added ${added} item${added === 1 ? '' : 's'} to ingest`];
    if (skipped > 0) {
        parts.push(`${skipped} already staged`);
    }
    if (failed > 0) {
        parts.push(`${failed} failed`);
    }

    return { type: 'summary', message: `${parts.join('; ')}.` };
}
