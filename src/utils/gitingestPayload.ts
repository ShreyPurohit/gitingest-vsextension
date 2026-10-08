const START_MARKER = '__GITINGEST_JSON_START__';
const END_MARKER = '__GITINGEST_JSON_END__';

/**
 * Pull the JSON object written by `gitingest-script.py` out of stdout that may
 * also contain library logs.
 *
 * The end marker is taken with `lastIndexOf` so a digest that itself quotes
 * `__GITINGEST_JSON_END__` (e.g. analyzing this extension repo) does not
 * truncate the payload mid-string and trigger `Unterminated string in JSON`.
 */
export function extractGitingestJsonPayload(output: string): string {
    const startIdx = output.indexOf(START_MARKER);
    const endIdx = output.lastIndexOf(END_MARKER);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        return output.substring(startIdx + START_MARKER.length, endIdx).trim();
    }

    throw new Error('GitIngest did not return a recognizable result payload.');
}
