import { DEFAULT_MAX_FILE_SIZE, MAX_ALLOWED_FILE_SIZE, MIN_ALLOWED_FILE_SIZE } from '../config';
import { IngestOptions } from '../types';

/** Trim, drop empties and de-duplicate a user supplied list of glob patterns. */
export function normalizePatterns(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set<string>();
    for (const entry of value) {
        if (typeof entry !== 'string') {
            continue;
        }
        const trimmed = entry.trim();
        if (trimmed !== '') {
            seen.add(trimmed);
        }
    }

    return [...seen];
}

/** Clamp a configured file-size limit into a sane byte range, falling back to the default. */
export function normalizeMaxFileSize(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return DEFAULT_MAX_FILE_SIZE;
    }

    const rounded = Math.floor(value);
    if (rounded < MIN_ALLOWED_FILE_SIZE) {
        return MIN_ALLOWED_FILE_SIZE;
    }

    return Math.min(rounded, MAX_ALLOWED_FILE_SIZE);
}

/** Build a valid options object from untrusted input (settings or webview messages). */
export function normalizeIngestOptions(options: unknown): IngestOptions {
    const source = (options ?? {}) as Record<string, unknown>;
    return {
        includePatterns: normalizePatterns(source.includePatterns),
        excludePatterns: normalizePatterns(source.excludePatterns),
        maxFileSize: normalizeMaxFileSize(source.maxFileSize),
    };
}

/**
 * Serialize options for `gitingest-script.py`. Anything left at its default is omitted so
 * the script keeps the package defaults - no include filter, and the package's own size
 * limit. Returns undefined when there is nothing to send, so a run without custom filters
 * invokes the script with the same arguments it always did.
 */
export function serializeIngestOptions(options: IngestOptions): string | undefined {
    const payload: Record<string, unknown> = {};

    if (options.includePatterns.length > 0) {
        payload.include_patterns = options.includePatterns;
    }
    if (options.excludePatterns.length > 0) {
        payload.exclude_patterns = options.excludePatterns;
    }
    if (options.maxFileSize !== DEFAULT_MAX_FILE_SIZE) {
        payload.max_file_size = options.maxFileSize;
    }

    return Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;
}
