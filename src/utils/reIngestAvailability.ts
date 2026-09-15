import * as vscode from 'vscode';

/** workspaceState key: why Re-Ingest is unavailable after the last successful run. */
export const RE_INGEST_UNAVAILABLE_REASON_KEY = 'gitingest.reIngestUnavailableReason';

/**
 * Shown when the last run analyzed the Add-to-Ingest staging folder and
 * Delete After Ingest removed that folder. Re-Ingest cannot re-run a path
 * that no longer exists.
 */
export const STAGING_DELETED_AFTER_INGEST_REASON =
    'Staging folder was deleted after ingest. Add files again to re-run.';

/**
 * Decide whether Re-Ingest should be unavailable after cleanup.
 * Only when the run targeted the tracked staging root and that root was deleted.
 */
export function reIngestUnavailableAfterCleanup(input: {
    analyzedTrackedIngestRoot: boolean;
    cleanupDeleted: boolean;
}): string | undefined {
    if (input.analyzedTrackedIngestRoot && input.cleanupDeleted) {
        return STAGING_DELETED_AFTER_INGEST_REASON;
    }
    return undefined;
}

export function readReIngestUnavailableReason(
    context: vscode.ExtensionContext,
): string | undefined {
    const reason = context.workspaceState.get<string>(RE_INGEST_UNAVAILABLE_REASON_KEY);
    if (typeof reason !== 'string') {
        return undefined;
    }
    const trimmed = reason.trim();
    return trimmed || undefined;
}

export function writeReIngestUnavailableReason(
    context: vscode.ExtensionContext,
    reason: string | undefined,
): Thenable<void> {
    return context.workspaceState.update(RE_INGEST_UNAVAILABLE_REASON_KEY, reason);
}
