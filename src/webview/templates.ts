import { ThemeColors, StatusMessage } from '../types';
import { THEME } from '../config';

const getBaseStyles = (theme: ThemeColors = THEME) => `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    padding: 20px;
    color: #1a1a1a;
    line-height: 1.6;
    background-color: #FFFDF8;
  }

  .shadow-wrapper {
    position: relative;
  }

  .shadow-wrapper::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #1a1a1a;
    border-radius: 12px;
    transform: translate(2px, 2px);
    z-index: 10;
  }

  .content-wrapper {
    background: #fafafa;
    border: 3px solid #1a1a1a;
    border-radius: 12px;
    padding: 24px;
    position: relative;
    z-index: 20;
  }

  .inner-content {
    background: #fff4da;
    border: 3px solid #1a1a1a;
    border-radius: 12px;
    padding: 24px;
    position: relative;
  }

  .inn {
    border: 3px solid #1a1a1a;
    border-radius: 12px;
    padding: 24px;
    position: relative;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: bold;
    color: #1a1a1a;
    margin-bottom: 16px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  button { 
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
    z-index: 20;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .primary-button {
    background-color: #ffc480;
    color: #1a1a1a;
    border: 3px solid #1a1a1a;
  }

  .primary-button:hover {
    transform: translate(-1px, -1px);
  }

  .danger-button {
    background-color: ${theme.danger};
    color: white;
    border: 3px solid #1a1a1a;
  }

  .danger-button:hover {
    transform: translate(-1px, -1px);
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }

  .content-box {
    background: #fff4da;
    border: 3px solid #1a1a1a;
    border-radius: 8px;
    padding: 16px;
    position: relative;
    margin-bottom: 16px;
  }

  .content-box::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #1a1a1a;
    border-radius: 8px;
    transform: translate(2px, 2px);
    z-index: -1;
  }

  textarea, pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    padding: 12px;
    background: #fff4da;
    border: 3px solid #1a1a1a;
    border-radius: 4px;
    width: 100%;
    min-height: 150px;
    resize: vertical;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }

  .scrollable-content {
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .status {
    margin-top: 10px;
    padding: 8px;
    border-radius: 4px;
  }

  .status.success { color: #27ae60; }
  .status.error { color: ${theme.danger}; }
  .status.warning { color: #f39c12; }

  .loader {
    border: 4px solid #fff4da;
    border-top: 4px solid #ffc480;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export function getLoadingContent(statusMessages: StatusMessage[]): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="shadow-wrapper">
        <div class="content-wrapper">
          <div class="inner-content">
            <div class="loader"></div>
            ${statusMessages.map(msg => `
              <div class="status ${msg.type}">
                ${msg.text}
              </div>
            `).join('')}
            <div class="relative">
              <div class="pre-shadow"></div>
              <button class="danger-button" onclick="cancelAnalysis()">
                Cancel Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        function cancelAnalysis() {
          vscode.postMessage({ command: 'cancel' });
        }
      </script>
    </body>
    </html>`;
}

export function getErrorContent(title: string, messages: string[], showSetupButton: boolean = true): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="shadow-wrapper">
        <div class="content-wrapper">
          <div class="inner-content">
            <h2 class="subtitle" style="color: #e74c3c;">${title}</h2>
            ${messages.map(msg => `<div class="status error">${msg}</div>`).join('')}
            ${showSetupButton ? `
              <div class="relative">
                <div class="pre-shadow"></div>
                <button class="primary-button" onclick="openSetupGuide()">
                  Show Setup Guide
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        function openSetupGuide() {
          vscode.postMessage({ command: 'showSetup' });
        }
      </script>
    </body>
    </html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getResultsContent(data: { summary: string; tree: string; content: string }): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="shadow-wrapper">
        <div class="content-wrapper">
          <div class="inn">
            <div class="grid">
              <!-- Summary Section -->
              <div>
                <div class="section-header">
                  <h3 class="section-title">Summary</h3>
                  <button class="primary-button" onclick="copySummary()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div class="content-box">
                  <div class="scrollable-content">
                    <pre>${escapeHtml(data.summary)}</pre>
                  </div>
                </div>
                <div class="button-group">
                  <button class="primary-button" onclick="copyAll()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy All
                  </button>
                </div>
              </div>

              <!-- Directory Structure Section -->
              <div>
                <div class="section-header">
                  <h3 class="section-title">Directory Structure</h3>
                  <button class="primary-button" onclick="copyTree()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div class="content-box">
                  <div class="scrollable-content">
                    <pre>${escapeHtml(data.tree)}</pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- Files Content Section -->
            <div>
              <div class="section-header">
                <h3 class="section-title">Files Content</h3>
                <button class="primary-button" onclick="copyContent()">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </button>
              </div>
              <div class="content-box">
                <div class="scrollable-content">
                  <pre>${escapeHtml(data.content)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        
        function copySummary() {
          const summary = document.querySelectorAll('.scrollable-content pre')[0].innerText;
          vscode.postMessage({ command: 'copy', text: summary });
        }

        function copyTree() {
          const tree = document.querySelectorAll('.scrollable-content pre')[1].innerText;
          vscode.postMessage({ command: 'copy', text: tree });
        }

        function copyContent() {
          const content = document.querySelectorAll('.scrollable-content pre')[2].innerText;
          vscode.postMessage({ command: 'copy', text: content });
        }

        function copyAll() {
          const allContent = [
            document.querySelectorAll('.scrollable-content pre')[0].innerText,
            document.querySelectorAll('.scrollable-content pre')[1].innerText,
            document.querySelectorAll('.scrollable-content pre')[2].innerText
          ].join('\\n\\n');
          vscode.postMessage({ command: 'copy', text: allContent });
        }
      </script>
    </body>
    </html>`;
}

export function getSetupGuideContent(): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="shadow-wrapper">
        <div class="content-wrapper">
          <div class="inner-content">
            <h1 class="title">GitIngest Setup Guide</h1>
            
            <div class="section">
              <h2 class="subtitle">1. Install Python</h2>
              <p style="margin-bottom: 1rem;">First, make sure you have Python installed on your system:</p>
              <ul class="list">
                <li>Download Python from <a href="https://python.org">python.org</a></li>
                <li>During installation, make sure to check "Add Python to PATH"</li>
                <li>Verify installation by running <code class="code">python --version</code> or <code class="code">python3 --version</code></li>
              </ul>
            </div>

            <div class="section">
              <h2 class="subtitle">2. Install GitIngest</h2>
              <p style="margin-bottom: 1rem;">Once Python is installed, you can install GitIngest using pip:</p>
              <code class="code-block">pip install gitingest</code>
              <p>Or if you're on Unix-like systems:</p>
              <code class="code-block">pip3 install gitingest</code>
            </div>

            <div class="section">
              <h2 class="subtitle">3. Usage</h2>
              <p style="margin-bottom: 1rem;">After installation:</p>
              <ol style="list-style-type: decimal; padding-left: 1.5rem;">
                <li style="margin-bottom: 0.5rem;">Open a Git repository in VS Code</li>
                <li style="margin-bottom: 0.5rem;">Use the command palette (Ctrl/Cmd + Shift + P)</li>
                <li>Search for "GitIngest: Analyze Repository"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>`;
}