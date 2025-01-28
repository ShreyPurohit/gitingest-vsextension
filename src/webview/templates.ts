import { ThemeColors, StatusMessage } from '../types';
import { THEME } from '../config';

const getBaseStyles = (theme: ThemeColors = THEME) => `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    padding: 20px;
    color: ${theme.text};
    line-height: 1.6;
  }
  button { 
    padding: 8px 16px;
    margin: 10px;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  .primary-button {
    background-color: ${theme.primary};
    color: white;
  }
  .primary-button:hover {
    background-color: ${theme.primaryHover};
  }
  .danger-button {
    background-color: ${theme.danger};
    color: white;
  }
  .danger-button:hover {
    background-color: ${theme.dangerHover};
  }
`;

export function getLoadingContent(statusMessages: StatusMessage[]): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        ${getBaseStyles()}
        .loading { 
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .spinner {
          border: 4px solid ${THEME.border};
          border-top: 4px solid ${THEME.primary};
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .status {
          margin-top: 10px;
          padding: 8px;
          border-radius: 4px;
        }
        .status.success { color: #27ae60; }
        .status.error { color: ${THEME.danger}; }
        .status.warning { color: #f39c12; }
      </style>
    </head>
    <body>
      <div class="loading">
        <div class="spinner"></div>
        ${statusMessages.map(msg => `
          <div class="status ${msg.type}">
            ${msg.text}
          </div>
        `).join('')}
        <button class="danger-button" onclick="vscode.postMessage({ command: 'cancel' })">
          Cancel Analysis
        </button>
      </div>
    </body>
    </html>`;
}

export function getErrorContent(title: string, messages: string[], showSetupButton: boolean = false): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        ${getBaseStyles()}
        .error { 
          color: ${THEME.danger};
          margin-bottom: 1.5em;
        }
        .message {
          margin: 10px 0;
          padding: 8px;
          background: ${THEME.background};
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <h2 class="error">${title}</h2>
      ${messages.map(msg => `<div class="message">${msg}</div>`).join('')}
      ${showSetupButton ? `
        <button class="primary-button" onclick="vscode.postMessage({ command: 'showSetup' })">
          Show Setup Guide
        </button>
      ` : ''}
    </body>
    </html>`;
}

export function getResultsContent(output: string): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        ${getBaseStyles()}
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          background-color: ${THEME.background};
          padding: 15px;
          border-radius: 4px;
          margin: 0;
          overflow-x: auto;
        }
        .button-container {
          margin-bottom: 20px;
          position: sticky;
          top: 0;
          background: white;
          padding: 10px 0;
          border-bottom: 1px solid ${THEME.border};
        }
      </style>
    </head>
    <body>
      <div class="button-container">
        <button class="primary-button" onclick="vscode.postMessage({ command: 'copy', text: document.querySelector('pre').textContent })">
          Copy Output
        </button>
      </div>
      <pre>${output}</pre>
    </body>
    </html>`;
}

export function getSetupGuideContent(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        ${getBaseStyles()}
        .step {
          margin-bottom: 2em;
          padding: 1em;
          background: ${THEME.background};
          border-radius: 8px;
        }
        code {
          background-color: #f0f0f0;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
        }
        h1 { color: ${THEME.primary}; }
        h2 { color: ${THEME.text}; }
      </style>
    </head>
    <body>
      <h1>GitIngest Setup Guide</h1>
      
      <div class="step">
        <h2>1. Install Python</h2>
        <p>First, make sure you have Python installed on your system:</p>
        <ul>
          <li>Download Python from <a href="https://python.org">python.org</a></li>
          <li>During installation, make sure to check "Add Python to PATH"</li>
          <li>Verify installation by running <code>python --version</code> or <code>python3 --version</code></li>
        </ul>
      </div>

      <div class="step">
        <h2>2. Install GitIngest</h2>
        <p>Once Python is installed, you can install GitIngest using pip:</p>
        <code>pip install gitingest</code>
        <p>Or if you're on Unix-like systems:</p>
        <code>pip3 install gitingest</code>
      </div>

      <div class="step">
        <h2>3. Usage</h2>
        <p>After installation:</p>
        <ol>
          <li>Open a Git repository in VS Code</li>
          <li>Use the command palette (Ctrl/Cmd + Shift + P)</li>
          <li>Search for "GitIngest: Analyze Repository"</li>
        </ol>
      </div>
    </body>
    </html>`;
}