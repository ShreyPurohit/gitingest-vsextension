/** A `Key: value` fact from the gitingest summary, e.g. `Files analyzed: 42`. */
export interface SummaryStat {
    label: string;
    value: string;
}

const STAT_PATTERN = /^([A-Za-z][A-Za-z0-9 _-]*):[ \t]*(\S.*)$/;
const MAX_STATS = 6;

/**
 * Pull the headline facts out of the summary so they can be shown as chips.
 * Returns an empty list for summaries that do not follow the `Key: value`
 * shape, so callers can simply omit the chips.
 */
export function parseSummaryStats(summary: string): SummaryStat[] {
    const stats: SummaryStat[] = [];

    for (const line of summary.split('\n')) {
        const match = STAT_PATTERN.exec(line.trim());
        if (!match) {
            continue;
        }

        stats.push({ label: match[1].trim(), value: match[2].trim() });
        if (stats.length === MAX_STATS) {
            break;
        }
    }

    return stats;
}
