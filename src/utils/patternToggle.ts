import { IngestOptions } from '../types';

export type PatternMode = 'include' | 'exclude';

/**
 * Toggle a directory-tree entry in the active filter list.
 *
 * Clicking an entry adds its glob to the list the panel is currently editing
 * and drops it from the other one; clicking it again removes it. A pattern
 * therefore never appears in both lists, and a second click is always the undo
 * of the first.
 */
export function togglePattern(
    options: IngestOptions,
    pattern: string,
    mode: PatternMode,
): IngestOptions {
    const trimmed = pattern.trim();
    if (trimmed === '') {
        return options;
    }

    const active = mode === 'include' ? options.includePatterns : options.excludePatterns;
    const wasSet = active.includes(trimmed);

    const includePatterns = options.includePatterns.filter((entry) => entry !== trimmed);
    const excludePatterns = options.excludePatterns.filter((entry) => entry !== trimmed);

    if (wasSet) {
        return { ...options, includePatterns, excludePatterns };
    }

    return mode === 'include'
        ? { ...options, includePatterns: [...includePatterns, trimmed], excludePatterns }
        : { ...options, includePatterns, excludePatterns: [...excludePatterns, trimmed] };
}
