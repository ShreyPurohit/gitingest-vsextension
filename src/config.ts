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
    analyze: 'vscode-gitingest.analyze',
    analyzeFolder: 'vscode-gitingest.analyzeFolder'
} as const;

export const WEBVIEW_OPTIONS = {
    enableScripts: true,
    retainContextWhenHidden: false
} as const;

export const ERROR_MESSAGES = {
    PYTHON_NOT_INSTALLED: 'Python 3.x is not found. Please install Python 3.x and ensure it is added to your PATH, then try again.',
    VENV_NOT_INSTALLED: 'Python venv module is not available. The extension will try to install virtualenv in user site-packages.',
    GITINGEST_NOT_INSTALLED: 'GitIngest package installation failed. Please ensure you have internet connectivity and try again.',
    NO_WORKSPACE: 'No workspace folder is open',
    PROCESS_KILL_FAILED: 'Failed to kill the analysis process',
    UNKNOWN_ERROR: 'An unknown error occurred',
    VENV_CREATION_FAILED: 'Failed to create virtual environment. The extension will try to install packages in user site-packages.',
    PERMISSION_ERROR: 'Permission denied. The extension will try to install in user site-packages.',
    VENV_PERMISSION_ERROR: 'Permission denied while creating virtual environment. The extension will try to create it in the user home directory instead.'
} as const;