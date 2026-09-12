import { IngestOptions } from '../types';

export type FilterMode = 'include' | 'exclude';

/**
 * Which list the filter row should show first after a run.
 *
 * Only open in Include when that list alone has patterns. When both lists have
 * entries (common once settings exclusions meet tree includes), start in Exclude
 * so configured exclusions stay visible; the Include list remains in the panel
 * data and appears when the user switches mode.
 */
export function initialFilterMode(applied: IngestOptions): FilterMode {
    if (applied.includePatterns.length > 0 && applied.excludePatterns.length === 0) {
        return 'include';
    }
    return 'exclude';
}
