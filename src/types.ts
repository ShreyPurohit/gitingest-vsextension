// Message types
export interface WebviewMessage {
    command: 'analyze' | 'cancel' | 'copy' | 'showSetup' | 'saveToFile' | 'retry';
    text?: string;
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

export interface AnalysisResult {
    type: 'success' | 'error';
    data?: {
        summary: string;
        tree: string;
        content: string;
    };
    message?: string;
}