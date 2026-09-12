import { THEME } from '../config';
import {
    AnalysisResultData,
    ButtonProps,
    ResultFilters,
    SectionProps,
    StatusMessage,
    ThemeColors,
} from '../types';
import {
    FILE_SIZE_STEPS_KB,
    formatFileSize,
    nearestStepIndex,
    stepBytes,
} from '../utils/fileSizeSteps';
import { initialFilterMode } from '../utils/filterMode';
import { parseTreeRows, toGlobPattern } from '../utils/treeParser';

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
    reset: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a4 4 0 010 8h-3m-7-8l4-4m-4 4l4 4" />',
    editor: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 3h8M8 12h8M8 16h5" />',
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

function Button({ onClick, variant = 'primary', icon, children, attrs = {} }: ButtonProps): string {
    const variantClasses = { primary: 'primary-button', danger: 'danger-button' };
    const attrString = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
    const attrPrefix = attrString ? ` ${attrString}` : '';
    return `<button class="button ${variantClasses[variant]}" onclick="${onClick}"${attrPrefix}>${icon ? `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>` : ''}${children}</button>`;
}

function Section({ title, content, copyButton = true, copyFunction, body }: SectionProps): string {
    const innerBody = body ?? `<pre>${content}</pre>`;
    return `<div><div class="section-header"><h3 class="section-title">${title}</h3>${copyButton ? `<button type="button" class="primary-button" onclick="${copyFunction || ''}"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icons.copy}</svg>Copy</button>` : ''}</div><div class="section-shadow-wrapper"><div class="content-box"><div class="scrollable-content">${innerBody}</div></div></div></div>`;
}

/**
 * Render the directory tree as clickable rows. Clicking an entry toggles it in
 * the list the filter row is editing: excluded entries are struck through,
 * included ones highlighted. The digest itself only changes on Re-Ingest.
 */
function TreeView(tree: string, filters?: ResultFilters): string {
    const rows = parseTreeRows(tree);
    if (!rows.some((row) => typeof row.path === 'string' && row.path !== '')) {
        return `<pre>${escapeHtml(tree)}</pre>`;
    }

    const applied = filters?.applied;
    const lines = rows
        .map((row) => {
            const text = escapeHtml(row.text);
            if (!row.path || !filters) {
                return `<div class="tree-line">${text}</div>`;
            }

            const pattern = toGlobPattern(row.path, row.isDirectory);
            const state = applied?.excludePatterns.includes(pattern)
                ? ' is-excluded'
                : applied?.includePatterns.includes(pattern)
                  ? ' is-included'
                  : '';
            return `<div class="tree-line tree-entry${state}" role="button" tabindex="0" title="${escapeHtml(row.path)}" data-pattern="${escapeHtml(pattern)}" onclick="toggleEntry(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleEntry(this)}">${text}</div>`;
        })
        .join('');

    return `<div class="tree">${lines}</div>`;
}

/**
 * Filter controls shown above the results, in the same shape as the ones on
 * gitingest.com: one pattern field with an Include/Exclude mode, and a slider
 * for the size limit. Built from the panel's existing pieces - a content box,
 * the shared input styling and ordinary buttons.
 */
function FilterPanel(ingestedPath: string, filters: ResultFilters): string {
    const { applied, defaults } = filters;
    // The field edits one list at a time; the other rides along in the dataset
    // so switching mode never silently drops it.
    const mode = initialFilterMode(applied);
    const patterns = mode === 'include' ? applied.includePatterns : applied.excludePatterns;
    const sizeIndex = nearestStepIndex(applied.maxFileSize);

    const dataset = [
        `data-path="${escapeHtml(ingestedPath)}"`,
        `data-mode="${mode}"`,
        `data-include="${escapeHtml(applied.includePatterns.join(', '))}"`,
        `data-exclude="${escapeHtml(applied.excludePatterns.join(', '))}"`,
        `data-default-include="${escapeHtml(defaults.includePatterns.join(', '))}"`,
        `data-default-exclude="${escapeHtml(defaults.excludePatterns.join(', '))}"`,
        `data-default-size="${nearestStepIndex(defaults.maxFileSize)}"`,
    ].join(' ');

    const option = (value: string, label: string): string =>
        `<option value="${value}"${value === mode ? ' selected' : ''}>${label}</option>`;

    return `<div class="section-shadow-wrapper"><div class="content-box"><div id="gi-filters" ${dataset}><div class="filter-row"><select id="gi-mode" aria-label="Filter mode" onchange="switchMode()">${option('exclude', 'Exclude')}${option('include', 'Include')}</select><input id="gi-patterns" type="text" spellcheck="false" placeholder="*.md, src/" value="${escapeHtml(patterns.join(', '))}"></div><div class="filter-row filter-row-size"><label for="gi-size">Include files under: <strong id="gi-size-label">${formatFileSize(stepBytes(sizeIndex))}</strong></label><input id="gi-size" type="range" min="0" max="${FILE_SIZE_STEPS_KB.length - 1}" step="1" value="${sizeIndex}" oninput="updateSizeLabel()"></div></div><div class="button-group">${Button({ onClick: 'reIngest()', icon: icons.retry, children: 'Re-Ingest' })}${Button({ onClick: 'resetFilters()', icon: icons.reset, children: 'Reset to Settings' })}</div></div></div>`;
}

// Styles

const getBaseStyles = (theme: ThemeColors = THEME) => `
body {font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;padding: 20px;color: #1a1a1a;line-height: 1.6;background-color: #FFFDF8;}.shadow-wrapper {position: relative;}.shadow-wrapper::before {content: '';position: absolute;inset: 0;background: #1a1a1a;border-radius: 12px;transform: translate(2px, 2px);z-index: 10;}.content-wrapper {background: #fafafa;border: 3px solid #1a1a1a;border-radius: 12px;padding: 24px;position: relative;z-index: 20;}.loading-container {display: flex;justify-content: center;align-items: center;min-height: 400px;}.loading-content {width: 100%;max-width: 500px;text-align: center;}.loader-wrapper {margin-bottom: 2rem;}.loading-title {font-size: 1.5rem;font-weight: 600;margin: 1rem 0;color: #1a1a1a;}.loader {border: 4px solid #fff4da;border-top: 4px solid #ffc480;border-radius: 50%;width: 60px;height: 60px;animation: spin 1s linear infinite;margin: 0 auto;}.status-container {margin: 2rem 0;}.status-item {display: flex;align-items: center;justify-content: center;gap: 0.75rem;padding: 0.75rem;margin-bottom: 0.75rem;border-radius: 8px;background: #fff4da;border: 2px solid #1a1a1a;font-size: 1rem;transition: transform 0.2s ease;}.status-item:hover {transform: translateY(-1px);}.status-item.success {color: #27ae60;}.status-item.error {color: ${theme.danger};}.status-item.warning {color: #f39c12;}.status-item.info {color: #3498db;}.status-icon {display: flex;align-items: center;}.status-text {font-weight: 500;}@keyframes spin {0% {transform: rotate(0deg);}100% {transform: rotate(360deg);}}.inner-content {background: #fff4da;border: 3px solid #1a1a1a;border-radius: 12px;padding: 24px;position: relative;}.grid {display: grid;grid-template-columns: 1fr 1fr;gap: 24px;margin-bottom: 24px;}@media (max-width: 768px) {.grid {grid-template-columns: 1fr;}}.section-title {font-size: 1.25rem;font-weight: bold;color: #1a1a1a;margin-bottom: 16px;}.section-header {display: flex;justify-content: space-between;align-items: center;margin-bottom: 16px;}button {padding: 12px 24px;cursor: pointer;border-radius: 8px;font-weight: 600;font-size: 1rem;transition: all 0.2s;position: relative;z-index: 20;display: inline-flex;align-items: center;gap: 0.5rem;}.primary-button {background-color: #ffc480;color: #1a1a1a;border: 3px solid #1a1a1a;}.primary-button:hover {transform: translate(-1px, -1px);}.danger-button {background-color: ${theme.danger};color: white;border: 3px solid #1a1a1a;}.danger-button:hover {transform: translate(-1px, -1px);}.button-group {display: flex;gap: 12px;margin-top: 16px;}.section-shadow-wrapper {position: relative;margin-bottom: 16px;}.section-shadow-wrapper::before {content: '';position: absolute;inset: 0;background: #1a1a1a;border-radius: 8px;transform: translate(2px, 2px);z-index: 10;}.content-box {background: #fff4da;border: 3px solid #1a1a1a;border-radius: 8px;padding: 16px;position: relative;z-index: 20;display: flex;flex-direction: column;height: 100%;}textarea, input[type='number'], pre {font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size: 0.875rem;line-height: 1.5;padding: 12px;background: #fff4da;border: 3px solid #1a1a1a;border-radius: 4px;width: 100%;min-height: 150px;resize: vertical;white-space: pre-wrap;word-wrap: break-word;margin: 0;}.scrollable-content {position: relative;max-height: 300px;overflow-y: auto;overflow-x: hidden;border: 3px solid #1a1a1a;border-radius: 4px;background: #fff4da;}.scrollable-content pre {border: none;margin: 0;height: 100%;}.error-container {display: flex;justify-content: center;align-items: center;min-height: 400px;}.error-content {width: 100%;max-width: 500px;text-align: center;}.error-icon {color: ${theme.danger};margin-bottom: 1.5rem;}.error-title {font-size: 1.75rem;font-weight: 600;color: ${theme.danger};margin-bottom: 1.5rem;}.error-messages {margin: 2rem 0;}.error-message {display: flex;align-items: center;justify-content: center;gap: 0.75rem;padding: 0.75rem;margin-bottom: 0.75rem;border-radius: 8px;background: #fff4da;border: 2px solid #1a1a1a;font-size: 1rem;transition: transform 0.2s ease;}.error-message:hover {transform: translateY(-1px);}.error-message-icon {display: flex;align-items: center;color: ${theme.danger};}.error-message-text {font-weight: 500;color: #1a1a1a;}.error-actions {display: flex;gap: 1rem;justify-content: center;margin-top: 2rem;}.filter-row {display: flex;align-items: center;gap: 12px;flex-wrap: wrap;margin-bottom: 16px;}.filter-row:last-child {margin-bottom: 0;}.filter-row select, .filter-row input[type='text'] {box-sizing: border-box;height: 44px;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size: 0.875rem;padding: 8px 12px;background: #fff4da;border: 3px solid #1a1a1a;border-radius: 4px;color: #1a1a1a;}.filter-row select {width: auto;font-weight: 600;}.filter-row input[type='text'] {flex: 1;min-width: 200px;}.filter-row-size {gap: 16px;}.filter-row-size label {font-weight: 500;}.filter-row input[type='range'] {flex: 1;min-width: 160px;max-width: 320px;accent-color: #ffc480;}.tree {font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size: 0.875rem;line-height: 1.5;padding: 12px;}.tree-line {padding: 1px 4px;white-space: pre;border-radius: 4px;}.tree-entry {cursor: pointer;}.tree-entry:hover {background: rgba(26, 26, 26, 0.08);}.tree-entry:focus-visible {outline: 2px solid #1a1a1a;outline-offset: -2px;}.tree-entry.is-excluded {text-decoration: line-through;opacity: 0.55;}.tree-entry.is-included {font-weight: 700;}
`;

// Templates

export function getErrorContent(title: string, messages: string[]): string {
    const content = `<div class="shadow-wrapper"><div class="content-wrapper"><div class="error-container"><div class="error-content"><div class="error-icon"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div><h2 class="error-title">${escapeHtml(title)}</h2><div class="error-messages">${messages.map((msg) => `<div class="error-message"><span class="error-message-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span><span class="error-message-text">${escapeHtml(msg)}</span></div>`).join('')}</div><div class="error-actions">${Button({ onClick: 'retryAnalysis()', variant: 'primary', children: 'Retry Analysis', icon: icons.retry })}</div></div></div></div></div><script>function retryAnalysis(){vscode.postMessage({command:'retry'})}</script>`;
    return createHtmlDocument(content, getBaseStyles(THEME));
}

export function getLoadingContent(statusMessages: StatusMessage[]): string {
    const content = `<div class="shadow-wrapper"><div class="content-wrapper"><div class="loading-container"><div class="loading-content"><div class="loader-wrapper"><div class="loader"></div><h2 class="loading-title">Analyzing Repository</h2></div><div class="status-container">${statusMessages.map((msg) => `<div class="status-item ${msg.type}"><span class="status-icon">${getStatusIcon(msg.type)}</span><span class="status-text">${msg.text}</span></div>`).join('')}</div>${Button({ onClick: 'cancelAnalysis()', variant: 'danger', children: 'Cancel Analysis' })}</div></div></div></div><script>function cancelAnalysis(){vscode.postMessage({command:'cancel'})}</script>`;
    return createHtmlDocument(content, getBaseStyles(THEME));
}

export function getResultsContent(
    data: AnalysisResultData,
    ingestedPath?: string,
    filters?: ResultFilters,
): string {
    const ingestedPathTrimmed = ingestedPath?.trim() ?? '';
    const filterPanel =
        ingestedPathTrimmed && filters ? FilterPanel(ingestedPathTrimmed, filters) : '';
    const reIngestButton =
        ingestedPathTrimmed && !filterPanel
            ? Button({
                  onClick: 'reIngest()',
                  icon: icons.retry,
                  children: 'Re-Ingest',
                  attrs: { 'data-path': escapeHtml(ingestedPathTrimmed) },
              })
            : '';
    const buttonGroup = `<div class="button-group">${Button({ onClick: "copy('all')", icon: icons.copy, children: 'Copy All' })}${Button({ onClick: 'saveToFile()', icon: icons.save, children: 'Save to File' })}${Button({ onClick: 'openInEditor()', icon: icons.editor, children: 'Open in Editor' })}${reIngestButton}</div>`;

    const summarySection = Section({
        title: 'Summary',
        content: escapeHtml(data.summary),
        copyFunction: "copy('summary')",
    });
    const treeSection = Section({
        title: 'Directory Structure',
        content: escapeHtml(data.tree),
        copyFunction: "copy('tree')",
        body: TreeView(data.tree, filters),
    });
    const contentSection = Section({
        title: 'Files Content',
        content: escapeHtml(data.content),
        copyFunction: "copy('content')",
    });

    const content = `<div class="shadow-wrapper"><div class="content-wrapper">${filterPanel}<div class="grid"><div>${summarySection}${buttonGroup}</div>${treeSection}</div>${contentSection}</div></div><script>${resultsScript()}</script>`;
    return createHtmlDocument(content, getBaseStyles(THEME));
}

/**
 * Panel behaviour. The digest stays in the extension: the panel asks for a
 * section by name and reports which tree entry was clicked, so nothing large is
 * duplicated in the DOM or sent across the message channel.
 */
function resultsScript(): string {
    return `
const STEPS_KB = ${JSON.stringify(FILE_SIZE_STEPS_KB)};
function splitPatterns(value) { return (value || '').split(/[\\n,]/).map(function (part) { return part.trim(); }).filter(Boolean); }
function panelEl() { return document.getElementById('gi-filters'); }
function currentMode() { const el = document.getElementById('gi-mode'); return el && el.value === 'include' ? 'include' : 'exclude'; }
function storePatterns() { const panel = panelEl(); if (!panel) { return; } panel.setAttribute('data-' + (panel.getAttribute('data-mode') || 'exclude'), document.getElementById('gi-patterns').value); }
function switchMode() { const panel = panelEl(); if (!panel) { return; } storePatterns(); const mode = currentMode(); panel.setAttribute('data-mode', mode); document.getElementById('gi-patterns').value = panel.getAttribute('data-' + mode) || ''; paintTree(); }
function sizeBytes() { const el = document.getElementById('gi-size'); return el ? STEPS_KB[Number(el.value)] * 1024 : undefined; }
function formatSize(bytes) { const kb = bytes / 1024; if (kb < 1024) { return Math.round(kb) + ' kB'; } const mb = kb / 1024; return (Number.isInteger(mb) ? mb : mb.toFixed(1)) + ' MB'; }
function updateSizeLabel() { const label = document.getElementById('gi-size-label'); if (label) { label.textContent = formatSize(sizeBytes()); } }
function currentOptions() { const panel = panelEl(); if (!panel) { return undefined; } storePatterns(); const options = { includePatterns: splitPatterns(panel.getAttribute('data-include')), excludePatterns: splitPatterns(panel.getAttribute('data-exclude')) }; const bytes = sizeBytes(); if (bytes) { options.maxFileSize = bytes; } return options; }
function paintTree() {
    const options = currentOptions();
    if (!options) { return; }
    const entries = document.querySelectorAll('.tree-entry');
    for (let i = 0; i < entries.length; i += 1) {
        const pattern = entries[i].getAttribute('data-pattern');
        entries[i].classList.toggle('is-excluded', options.excludePatterns.indexOf(pattern) !== -1);
        entries[i].classList.toggle('is-included', options.includePatterns.indexOf(pattern) !== -1);
    }
}
function toggleEntry(row) { vscode.postMessage({ command: 'toggleFilter', pattern: row.getAttribute('data-pattern'), mode: currentMode(), options: currentOptions() }); }
window.addEventListener('message', function (event) {
    const message = event.data;
    if (!message || message.type !== 'filtersUpdated') { return; }
    const panel = panelEl();
    if (!panel) { return; }
    panel.setAttribute('data-include', (message.options.includePatterns || []).join(', '));
    panel.setAttribute('data-exclude', (message.options.excludePatterns || []).join(', '));
    document.getElementById('gi-patterns').value = panel.getAttribute('data-' + currentMode()) || '';
    paintTree();
});
function resetFilters() { const panel = panelEl(); if (!panel) { return; } panel.setAttribute('data-include', panel.getAttribute('data-default-include') || ''); panel.setAttribute('data-exclude', panel.getAttribute('data-default-exclude') || ''); document.getElementById('gi-patterns').value = panel.getAttribute('data-' + currentMode()) || ''; document.getElementById('gi-size').value = panel.getAttribute('data-default-size') || '0'; updateSizeLabel(); paintTree(); }
function reIngest() { const panel = panelEl(); const fallback = document.querySelector('[data-path]'); const pathValue = panel ? panel.getAttribute('data-path') : fallback && fallback.getAttribute('data-path'); if (!pathValue) { return; } vscode.postMessage({ command: 'reIngest', path: pathValue, options: currentOptions() }); }
function copy(section) { vscode.postMessage({ command: 'copy', section: section }); }
function saveToFile() { vscode.postMessage({ command: 'saveToFile' }); }
function openInEditor() { vscode.postMessage({ command: 'openInEditor' }); }
`;
}

// Utils

function createHtmlDocument(content: string, styles: string): string {
    return `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';"><style>${styles}</style><script>const vscode = acquireVsCodeApi();</script></head><body>${content}</body></html>`;
}
