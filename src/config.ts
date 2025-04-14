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
    GITINGEST_NOT_INSTALLED: 'GitIngest package installation failed. Please ensure you have internet connectivity and try again.',
    NO_WORKSPACE: 'No workspace folder is open',
    PROCESS_KILL_FAILED: 'Failed to kill the analysis process',
    UNKNOWN_ERROR: 'An unknown error occurred',
    INVALID_FOLDER: 'Invalid folder selected',
    EXECUTION_FAILED: 'Failed to execute Python script',
    PARSE_ERROR: 'Failed to parse analysis output',
    VENV_CREATION_FAILED: 'Failed to create virtual environment in both project and user directories. Please ensure you have Python 3.x installed with venv module and appropriate permissions.',
    PERMISSION_ERROR: 'Permission denied. The extension will create a local virtual environment instead.'
} as const;

export const PYTHON_INSTALL_GUIDE = {
    WINDOWS: 'https://www.python.org/downloads/windows/',
    LINUX: 'https://docs.python.org/3/using/unix.html',
    MAC: 'https://www.python.org/downloads/macos/'
} as const;