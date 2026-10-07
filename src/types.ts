// Message types
export interface WebviewMessage {
    command:
        | 'analyze'
        | 'cancel'
        | 'copy'
        | 'saveToFile'
        | 'openInEditor'
        | 'retry'
        | 'reIngest'
        | 'toggleFilter';
    text?: string;
    path?: string;
    /** Which part of the digest a copy applies to; the extension holds the text. */
    section?: 'summary' | 'tree' | 'content' | 'all';
    /** Tree entry clicked, and which list the panel is editing. */
    pattern?: string;
    mode?: 'include' | 'exclude';
    /** Filters edited in the results panel; untrusted, normalized before use. */
    options?: unknown;
}

/** Filter options passed through to the gitingest engine. */
export interface IngestOptions {
    includePatterns: string[];
    excludePatterns: string[];
    /** Maximum size, in bytes, of a single file included in the digest. */
    maxFileSize: number;
}

/** Filter state shown in the results panel: what the run used, and what the settings say. */
export interface ResultFilters {
    applied: IngestOptions;
    defaults: IngestOptions;
    /**
     * When set, Re-Ingest is shown disabled with this text as the hover title.
     * Used when the staging folder was removed by Delete After Ingest.
     */
    reIngestUnavailableReason?: string;
}

// Configuration types
export interface ThemeColors {
    primary: string;
    primaryHover: string;
    danger: string;
    dangerHover: string;
    background: string;
    border: string;
    text: string;
}

export interface StatusMessage {
    text: string;
    type: 'info' | 'success' | 'error' | 'warning';
}

/** Shape of the data payload shown in the results webview and saved to file. */
export interface AnalysisResultData {
    summary: string;
    tree: string;
    content: string;
}

export interface AnalysisResult {
    type: 'success' | 'error';
    data?: AnalysisResultData;
    message?: string;
}

export interface ButtonProps {
    onClick: string;
    variant?: 'primary' | 'danger';
    icon?: string;
    children: string;
    attrs?: Record<string, string>;
    /** Native disabled + hover title for unavailable actions. */
    disabled?: boolean;
    title?: string;
}

export interface SectionProps {
    title: string;
    /** Escaped text rendered in the default <pre> body. */
    content: string;
    copyButton?: boolean;
    copyFunction?: string;
    /** Custom body markup, replacing the default <pre>. */
    body?: string;
}

/** Which filter list a tree-entry toggle targets. */
export type FilterMode = 'include' | 'exclude';

/** One entry of a directory listing used by the ingest staging helpers. */
export interface IngestDirectoryEntry {
    name: string;
    isDirectory: boolean;
}

/**
 * The filesystem operations staging needs. `WorkspaceService` backs this with
 * `vscode.workspace.fs`; tests back it with an in-memory fake.
 */
export interface IngestFileSystem {
    exists(targetPath: string): Promise<boolean>;
    readDirectory(directoryPath: string): Promise<IngestDirectoryEntry[]>;
    createDirectory(directoryPath: string): Promise<void>;
    copy(sourcePath: string, destinationPath: string): Promise<void>;
}

/** Where a resource should be copied inside the ingest folder. */
export interface IngestDestination {
    /** Path segments, relative to the ingest root, that lead to the copied resource. */
    segments: string[];
    /** Workspace-relative path of the source, shown in user-facing messages. */
    relativePath: string;
}

/** Tally of a multi-resource Add to Ingest run. */
export type IngestBatchCounts = {
    added: number;
    skipped: number;
    failed: number;
};

/** User-facing outcome of a multi-resource Add to Ingest run. */
export type IngestBatchOutcome =
    | { type: 'all-skipped'; message: string }
    | { type: 'all-failed'; message: string }
    | { type: 'summary'; message: string };

/** One rendered line of the gitingest directory tree. */
export interface TreeRow {
    /** The original line, so the rendered tree still looks like the raw output. */
    text: string;
    /**
     * Path relative to the ingested root, or undefined when the line is not an
     * actionable entry (headers, blank lines, the root itself).
     */
    path?: string;
    isDirectory: boolean;
}
