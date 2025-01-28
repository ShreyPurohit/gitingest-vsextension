// Message types
export interface WebviewMessage {
    command: 'cancel' | 'copy' | 'showSetup';
    text?: string;
}

export interface ExecResult {
    stdout: string;
    stderr: string;
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