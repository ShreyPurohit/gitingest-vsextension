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
