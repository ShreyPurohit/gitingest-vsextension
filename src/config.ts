import { ThemeColors } from './types';

export const THEME: ThemeColors = {
    primary: '#3498db',
    primaryHover: '#2980b9',
    danger: '#e74c3c',
    dangerHover: '#c0392b',
    background: '#f5f5f5',
    border: '#e0e0e0',
    text: '#2c3e50'
};

export const COMMANDS = {
    setup: 'vscode-gitingest.setup',
    analyze: 'vscode-gitingest.analyze'
} as const;

export const WEBVIEW_OPTIONS = {
    enableScripts: true,
    retainContextWhenHidden: false
} as const;

export const ERROR_MESSAGES = {
    PYTHON_NOT_INSTALLED: 'Python is not installed or not in PATH',
    GITINGEST_NOT_INSTALLED: 'GitIngest is not installed',
    NO_WORKSPACE: 'No workspace folder open',
    PROCESS_KILL_FAILED: 'Failed to kill process',
    UNKNOWN_ERROR: 'An unknown error occurred'
} as const;