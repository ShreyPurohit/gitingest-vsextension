import { MAX_ALLOWED_FILE_SIZE } from '../config';

/**
 * Slider stops, in kilobytes, for the "include files under" control. Coarse and
 * roughly logarithmic, like the slider on gitingest.com, so the useful range is
 * reachable in a few steps instead of by typing a byte count.
 */
export const FILE_SIZE_STEPS_KB = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1024, 2048, 5120, 10240, 20480, 51200, 102400,
];

export function stepBytes(index: number): number {
    const clamped = Math.min(Math.max(Math.round(index), 0), FILE_SIZE_STEPS_KB.length - 1);
    return Math.min(FILE_SIZE_STEPS_KB[clamped] * 1024, MAX_ALLOWED_FILE_SIZE);
}

/** Slider position whose size is closest to `bytes`. */
export function nearestStepIndex(bytes: number): number {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    FILE_SIZE_STEPS_KB.forEach((kb, index) => {
        const distance = Math.abs(kb * 1024 - bytes);
        if (distance < bestDistance) {
            best = index;
            bestDistance = distance;
        }
    });

    return best;
}

/** Human-readable size for the slider label, e.g. `50 kB` or `10 MB`. */
export function formatFileSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${Math.round(kb)} kB`;
    }

    const mb = kb / 1024;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
