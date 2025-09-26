import { THEME } from '../config';
import { ButtonProps, SectionProps, StatusMessage, ThemeColors } from '../types';

// Helpers

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const icons = {
    copy: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />',
    save: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />',
    retry: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />',
    play: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z" />',
    success:
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
    warning:
        '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
};

function getStatusIcon(type: string): string {
    switch (type) {
        case 'success':
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons.success}</svg>`;
        case 'error':
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons.error}</svg>`;
        case 'warning':
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons.warning}</svg>`;
        default:
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons.info}</svg>`;
    }
}

// Components

function Button({ onClick, variant = 'primary', icon, children }: ButtonProps): string {
    const variantClasses = { primary: 'primary-button', danger: 'danger-button' };
    return `<button class="button ${variantClasses[variant]}" onclick="${onClick}">${icon ? `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>` : ''}${children}</button>`;
}

function Section({ title, content, copyButton = true, copyFunction }: SectionProps): string {
    return `<div><div class="section-header"><h3 class="section-title">${title}</h3>${copyButton ? `<button class="primary-button" onclick="${copyFunction || ''}"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>Copy</button>` : ''}</div><div class="section-shadow-wrapper"><div class="content-box"><div class="scrollable-content"><pre>${content}</pre></div></div></div></div>`;
}

// Styles

const getBaseStyles = (theme: ThemeColors = THEME) => `
body {font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;padding: 20px;color: #1a1a1a;line-height: 1.6;background-color: #FFFDF8;}.shadow-wrapper {position: relative;}.shadow-wrapper::before {content: '';position: absolute;inset: 0;background: #1a1a1a;border-radius: 12px;transform: translate(2px, 2px);z-index: 10;}.content-wrapper {background: #fafafa;border: 3px solid #1a1a1a;border-radius: 12px;padding: 24px;position: relative;z-index: 20;}.loading-container {display: flex;justify-content: center;align-items: center;min-height: 400px;}.loading-content {width: 100%;max-width: 500px;text-align: center;}.loader-wrapper {margin-bottom: 2rem;}.loading-title {font-size: 1.5rem;font-weight: 600;margin: 1rem 0;color: #1a1a1a;}.loader {border: 4px solid #fff4da;border-top: 4px solid #ffc480;border-radius: 50%;width: 60px;height: 60px;animation: spin 1s linear infinite;margin: 0 auto;}.status-container {margin: 2rem 0;}.status-item {display: flex;align-items: center;justify-content: center;gap: 0.75rem;padding: 0.75rem;margin-bottom: 0.75rem;border-radius: 8px;background: #fff4da;border: 2px solid #1a1a1a;font-size: 1rem;transition: transform 0.2s ease;}.status-item:hover {transform: translateY(-1px);}.status-item.success {color: #27ae60;}.status-item.error {color: ${theme.danger};}.status-item.warning {color: #f39c12;}.status-item.info {color: #3498db;}.status-icon {display: flex;align-items: center;}.status-text {font-weight: 500;}@keyframes spin {0% {transform: rotate(0deg);}100% {transform: rotate(360deg);}}.inner-content {background: #fff4da;border: 3px solid #1a1a1a;border-radius: 12px;padding: 24px;position: relative;}.grid {display: grid;grid-template-columns: 1fr 1fr;gap: 24px;margin-bottom: 24px;}@media (max-width: 768px) {.grid {grid-template-columns: 1fr;}}.section-title {font-size: 1.25rem;font-weight: bold;color: #1a1a1a;margin-bottom: 16px;}.section-header {display: flex;justify-content: space-between;align-items: center;margin-bottom: 16px;}button {padding: 12px 24px;cursor: pointer;border-radius: 8px;font-weight: 600;font-size: 1rem;transition: all 0.2s;position: relative;z-index: 20;display: inline-flex;align-items: center;gap: 0.5rem;}.primary-button {background-color: #ffc480;color: #1a1a1a;border: 3px solid #1a1a1a;}.primary-button:hover {transform: translate(-1px, -1px);}.danger-button {background-color: ${theme.danger};color: white;border: 3px solid #1a1a1a;}.danger-button:hover {transform: translate(-1px, -1px);}.button-group {display: flex;gap: 12px;margin-top: 16px;}.section-shadow-wrapper {position: relative;margin-bottom: 16px;}.section-shadow-wrapper::before {content: '';position: absolute;inset: 0;background: #1a1a1a;border-radius: 8px;transform: translate(2px, 2px);z-index: 10;}.content-box {background: #fff4da;border: 3px solid #1a1a1a;border-radius: 8px;padding: 16px;position: relative;z-index: 20;display: flex;flex-direction: column;height: 100%;}textarea, pre {font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size: 0.875rem;line-height: 1.5;padding: 12px;background: #fff4da;border: 3px solid #1a1a1a;border-radius: 4px;width: 100%;min-height: 150px;resize: vertical;white-space: pre-wrap;word-wrap: break-word;margin: 0;}.scrollable-content {position: relative;max-height: 300px;overflow-y: auto;overflow-x: hidden;border: 3px solid #1a1a1a;border-radius: 4px;background: #fff4da;}.scrollable-content pre {border: none;margin: 0;height: 100%;}.error-container {display: flex;justify-content: center;align-items: center;min-height: 400px;}.error-content {width: 100%;max-width: 500px;text-align: center;}.error-icon {color: ${theme.danger};margin-bottom: 1.5rem;}.error-title {font-size: 1.75rem;font-weight: 600;color: ${theme.danger};margin-bottom: 1.5rem;}.error-messages {margin: 2rem 0;}.error-message {display: flex;align-items: center;justify-content: center;gap: 0.75rem;padding: 0.75rem;margin-bottom: 0.75rem;border-radius: 8px;background: #fff4da;border: 2px solid #1a1a1a;font-size: 1rem;transition: transform 0.2s ease;}.error-message:hover {transform: translateY(-1px);}.error-message-icon {display: flex;align-items: center;color: ${theme.danger};}.error-message-text {font-weight: 500;color: #1a1a1a;}.error-actions {display: flex;gap: 1rem;justify-content: center;margin-top: 2rem;}
`;

// Templates

export function getErrorContent(title: string, messages: string[]): string {
    const content = `<div class="shadow-wrapper"><div class="content-wrapper"><div class="error-container"><div class="error-content"><div class="error-icon"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div><h2 class="error-title">${title}</h2><div class="error-messages">${messages.map((msg) => `<div class="error-message"><span class="error-message-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span><span class="error-message-text">${msg}</span></div>`).join('')}</div><div class="error-actions">${Button({ onClick: 'retryAnalysis()', variant: 'primary', children: 'Retry Analysis', icon: icons.retry })}</div></div></div></div></div><script>function retryAnalysis(){vscode.postMessage({command:'retry'})}</script>`;
    return createHtmlDocument(content, getBaseStyles(THEME));
}

export function getLoadingContent(statusMessages: StatusMessage[]): string {
    const content = `<div class="shadow-wrapper"><div class="content-wrapper"><div class="loading-container"><div class="loading-content"><div class="loader-wrapper"><div class="loader"></div><h2 class="loading-title">Analyzing Repository</h2></div><div class="status-container">${statusMessages.map((msg) => `<div class="status-item ${msg.type}"><span class="status-icon">${getStatusIcon(msg.type)}</span><span class="status-text">${msg.text}</span></div>`).join('')}</div>${Button({ onClick: 'cancelAnalysis()', variant: 'danger', children: 'Cancel Analysis' })}</div></div></div></div><script>function cancelAnalysis(){vscode.postMessage({command:'cancel'})}</script>`;
    return createHtmlDocument(content, getBaseStyles(THEME));
}

export function getResultsContent(data: {
    summary: string;
    tree: string;
    content: string;
}): string {
    const content = `<div class="shadow-wrapper"><div class="content-wrapper"><div class="grid"><div>${Section({ title: 'Summary', content: escapeHtml(data.summary), copyFunction: 'copySummary()' })}<div class="button-group">${Button({ onClick: 'copyAll()', icon: icons.copy, children: 'Copy All' })}${Button({ onClick: 'saveToFile()', icon: icons.save, children: 'Save to File' })}</div></div>${Section({ title: 'Directory Structure', content: escapeHtml(data.tree), copyFunction: 'copyTree()' })}</div>${Section({ title: 'Files Content', content: escapeHtml(data.content), copyFunction: 'copyContent()' })}</div></div><script>function copySummary(){const summary=document.querySelectorAll('.scrollable-content pre')[0].innerText;vscode.postMessage({command:'copy',text:summary})}function copyTree(){const tree=document.querySelectorAll('.scrollable-content pre')[1].innerText;vscode.postMessage({command:'copy',text:tree})}function copyContent(){const content=document.querySelectorAll('.scrollable-content pre')[2].innerText;vscode.postMessage({command:'copy',text:content})}function copyAll(){const allContent=[document.querySelectorAll('.scrollable-content pre')[0].innerText,document.querySelectorAll('.scrollable-content pre')[1].innerText,document.querySelectorAll('.scrollable-content pre')[2].innerText].join('\\n\\n');vscode.postMessage({command:'copy',text:allContent})}function saveToFile(){const summary=document.querySelectorAll('.scrollable-content pre')[0].innerText;const tree=document.querySelectorAll('.scrollable-content pre')[1].innerText;const content=document.querySelectorAll('.scrollable-content pre')[2].innerText;vscode.postMessage({command:'saveToFile',data:{summary,tree,content}})}</script>`;
    return createHtmlDocument(content, getBaseStyles(THEME));
}

// Utils

function createHtmlDocument(content: string, styles: string): string {
    return `<!DOCTYPE html><html><head><style>${styles}</style><script>const vscode = acquireVsCodeApi();</script></head><body>${content}</body></html>`;
}
