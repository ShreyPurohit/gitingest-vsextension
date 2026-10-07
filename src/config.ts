import { StatusMessage, ThemeColors } from './types';

export const THEME: ThemeColors = {
    primary: '#3498db',
    primaryHover: '#2980b9',
    danger: '#e74c3c',
    dangerHover: '#c0392b',
    background: '#f5f5f5',
    border: '#e0e0e0',
    text: '#2c3e50',
};

export const COMMANDS = {
    analyze: 'vscode-gitingest.analyze',
    analyzeFolder: 'vscode-gitingest.analyzeFolder',
    addToIngest: 'vscode-gitingest.addToIngest',
    /** SCM menus: dedicated entry points (resource state/folder/group). */
    analyzeFolderFromScm: 'vscode-gitingest.analyzeFolderFromScm',
    addToIngestFromScm: 'vscode-gitingest.addToIngestFromScm',
    reIngest: 'vscode-gitingest.reIngest',
} as const;

/** Matches the gitingest package default of 10 MB per file. */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MIN_ALLOWED_FILE_SIZE = 1024;
export const MAX_ALLOWED_FILE_SIZE = 100 * 1024 * 1024;

export const WEBVIEW_OPTIONS = {
    enableScripts: true,
    retainContextWhenHidden: true,
} as const;

/** workspaceState keys for the last analyzed folder and the options it ran with. */
export const LAST_INGESTED_PATH_KEY = 'gitingest.lastIngestedPath';
export const LAST_INGEST_OPTIONS_KEY = 'gitingest.lastIngestOptions';

/** The two "verified" status lines, built once and reused by verify + analyze. */
export const VERIFIED_STATUS: StatusMessage[] = [
    { text: 'Python installation verified ✓', type: 'success' },
    { text: 'GitIngest package verified ✓', type: 'success' },
];

export const ERROR_MESSAGES = {
    PYTHON_NOT_INSTALLED:
        'Python 3.x is not found. Please install Python 3.x and ensure it is added to your PATH, then try again.',
    NO_WORKSPACE: 'No workspace folder is open',
    PROCESS_KILL_FAILED: 'Failed to kill the analysis process',
    UNKNOWN_ERROR: 'An unknown error occurred',
    INVALID_FOLDER: 'Invalid folder selected',
    SCM_UNRESOLVED: 'GitIngest could not resolve the selected Source Control item in this editor.',
} as const;
