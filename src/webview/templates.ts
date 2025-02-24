import { getBaseStyles } from './styles/base';
import { Button, icons } from './components/button';
import { Section } from './components/section';
import { escapeHtml, createHtmlDocument } from './utils/html';
import { StatusMessage } from '../types';
import { THEME } from '../config';

export function getLoadingContent(statusMessages: StatusMessage[]): string {
  const content = `
    <div class="shadow-wrapper">
      <div class="content-wrapper">
        <div class="loading-container">
          <div class="loading-content">
            <div class="loader-wrapper">
              <div class="loader"></div>
              <h2 class="loading-title">Analyzing Repository</h2>
            </div>
            
            <div class="status-container">
              ${statusMessages.map(msg => `
                <div class="status-item ${msg.type}">
                  <span class="status-icon">${getStatusIcon(msg.type)}</span>
                  <span class="status-text">${msg.text}</span>
                </div>
              `).join('')}
            </div>

            ${Button({
    onClick: 'cancelAnalysis()',
    variant: 'danger',
    children: 'Cancel Analysis'
  })}
          </div>
        </div>
      </div>
    </div>
    <script>
      function cancelAnalysis() {
        vscode.postMessage({ command: 'cancel' });
      }
    </script>
  `;

  return createHtmlDocument(content, getBaseStyles(THEME));
}

export function getErrorContent(title: string, messages: string[], showSetupButton: boolean = true): string {
  const content = `
    <div class="shadow-wrapper">
      <div class="content-wrapper">
        <div class="error-container">
          <div class="error-content">
            <div class="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            
            <h2 class="error-title">${title}</h2>
            
            <div class="error-messages">
              ${messages.map(msg => `
                <div class="error-message">
                  <span class="error-message-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </span>
                  <span class="error-message-text">${msg}</span>
                </div>
              `).join('')}
            </div>

            ${showSetupButton ? `
              <div class="error-actions">
                ${Button({
    onClick: 'openSetupGuide()',
    children: 'Show Setup Guide',
    icon: icons.setup
  })}
                ${Button({
    onClick: 'retryAnalysis()',
    variant: 'primary',
    children: 'Retry Analysis',
    icon: icons.retry
  })}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
    <script>
      function openSetupGuide() {
        vscode.postMessage({ command: 'showSetup' });
      }
      function retryAnalysis() {
        vscode.postMessage({ command: 'retry' });
      }
    </script>
  `;

  return createHtmlDocument(content, getBaseStyles(THEME));
}

function getStatusIcon(type: string): string {
  switch (type) {
    case 'success':
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    case 'error':
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    case 'warning':
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    default:
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }
}

export function getResultsContent(data: { summary: string; tree: string; content: string }): string {
  const content = `
    <div class="shadow-wrapper">
      <div class="content-wrapper">
        <div class="grid">
          <div>
            ${Section({
    title: 'Summary',
    content: escapeHtml(data.summary),
    copyFunction: 'copySummary()'
  })}
            <div class="button-group">
              ${Button({
    onClick: 'copyAll()',
    icon: icons.copy,
    children: 'Copy All'
  })}
              ${Button({
    onClick: 'saveToFile()',
    icon: icons.save,
    children: 'Save to File'
  })}
            </div>
          </div>
          ${Section({
    title: 'Directory Structure',
    content: escapeHtml(data.tree),
    copyFunction: 'copyTree()'
  })}
        </div>

        ${Section({
    title: 'Files Content',
    content: escapeHtml(data.content),
    copyFunction: 'copyContent()'
  })}
      </div>
    </div>
    <script>
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

      function saveToFile() {
        vscode.postMessage({ command: 'saveToFile' });
      }
    </script>
  `;

  return createHtmlDocument(content, getBaseStyles(THEME));
}

export function getSetupGuideContent(): string {
  const content = `
    <div class="shadow-wrapper">
      <div class="content-wrapper">
        <div class="setup-guide">
          <div class="setup-header">
            <div class="setup-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 class="setup-title">GitIngest Setup Guide</h1>
            <p class="setup-subtitle">Follow these steps to get started with GitIngest</p>
          </div>

          <div class="setup-steps">
            <div class="setup-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h2 class="step-title">Install Python</h2>
                <div class="step-description">
                  <p>First, make sure you have Python installed on your system:</p>
                  <div class="step-card">
                    <div class="card-item">
                      <div class="card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/>
                          <path d="M3 12v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>
                          <path d="M12 12v8"/>
                          <path d="M12 12 8 8"/>
                          <path d="m12 12 4-4"/>
                        </svg>
                      </div>
                      <div class="card-text">
                        <a href="https://python.org" class="card-link">Download Python from python.org</a>
                      </div>
                    </div>
                    <div class="card-item">
                      <div class="card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div class="card-text">
                        Check "Add Python to PATH" during installation
                      </div>
                    </div>
                    <div class="card-item">
                      <div class="card-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                          <polyline points="16 7 22 7 22 13"/>
                        </svg>
                      </div>
                      <div class="card-text">
                        Verify by running: <code class="inline-code">python --version</code> or <code class="inline-code">python3 --version</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="setup-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h2 class="step-title">Install GitIngest</h2>
                <div class="step-description">
                  <p>Once Python is installed, you can install GitIngest using pip:</p>
                  <div class="code-block-wrapper">
                    <div class="code-block">
                      <code>pip install gitingest</code>
                      <button class="copy-button" onclick="copyToClipboard('pip install gitingest')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>
                    <p class="code-note">Or if you're on Unix-like systems:</p>
                    <div class="code-block">
                      <code>pip3 install gitingest</code>
                      <button class="copy-button" onclick="copyToClipboard('pip3 install gitingest')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="setup-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h2 class="step-title">Usage</h2>
                <div class="step-description">
                  <p>After installation, you're ready to analyze repositories:</p>
                  <div class="usage-steps">
                    <div class="usage-step">
                      <div class="usage-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                          <path d="M9 18c-4.51 2-5-2-7-2"/>
                        </svg>
                      </div>
                      <div class="usage-text">Open a Git repository in VS Code</div>
                    </div>
                    <div class="usage-step">
                      <div class="usage-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <line x1="3" y1="9" x2="21" y2="9"/>
                          <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                      </div>
                      <div class="usage-text">
                        Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> to open the command palette
                      </div>
                    </div>
                    <div class="usage-step">
                      <div class="usage-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </div>
                      <div class="usage-text">Type "GitIngest: Analyze Repository" and press Enter</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="setup-footer">
            <button class="primary-button" onclick="startAnalysis()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
    <script>
      const vscode = acquireVsCodeApi();

      function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        vscode.postMessage({ command: 'copy', text });
      }

      function startAnalysis() {
        vscode.postMessage({ command: 'analyze' });
      }
    </script>
  `;

  const styles = getBaseStyles(THEME) + `
    .setup-guide {
      max-width: 800px;
      margin: 0 auto;
    }

    .setup-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .setup-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      color: #1a1a1a;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .setup-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }

    .setup-subtitle {
      font-size: 1.1rem;
      color: #666;
    }

    .setup-steps {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .setup-step {
      display: flex;
      gap: 1.5rem;
      padding: 1.5rem;
      background: #fff4da;
      border: 3px solid #1a1a1a;
      border-radius: 12px;
      position: relative;
    }

    .setup-step::before {
      content: '';
      position: absolute;
      inset: 0;
      background: #1a1a1a;
      border-radius: 12px;
      transform: translate(4px, 4px);
      z-index: -1;
    }

    .step-number {
      width: 40px;
      height: 40px;
      background: #ffc480;
      border: 3px solid #1a1a1a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .step-content {
      flex-grow: 1;
    }

    .step-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #1a1a1a;
      margin-top: 0;
    }

    .step-description p {
      margin-bottom: 1rem;
      color: #1a1a1a;
    }

    .step-card {
      background: #fff;
      border: 3px solid #1a1a1a;
      border-radius: 8px;
      padding: 1rem;
    }

    .card-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .card-item:last-child {
      border-bottom: none;
    }

    .card-icon {
      color: #1a1a1a;
      height: 20px;
    }

    .card-text {
      font-size: 1rem;
      color: #1a1a1a;
    }

    .card-link {
      color: #0366d6;
      text-decoration: none;
      font-weight: 500;
    }

    .card-link:hover {
      text-decoration: underline;
    }

    .code-block-wrapper {
      margin: 1rem 0;
    }

    .code-block {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .code-block code {
      color: #fff;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    }

    .code-note {
      font-size: 0.9rem;
      color: #666;
      margin: 0.5rem 0;
    }

    .copy-button {
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .copy-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .inline-code {
      background: #1a1a1a;
      color: #fff;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .usage-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .usage-step {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #fff;
      border: 2px solid #1a1a1a;
      border-radius: 8px;
    }

    .usage-icon {
      color: #1a1a1a;
      height: 20px;
    }

    .usage-text {
      color: #1a1a1a;
      font-size: 1rem;
    }

    kbd {
      background: #1a1a1a;
      color: #fff;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 0.9rem;
      margin: 0 0.2rem;
    }

    .setup-footer {
      margin-top: 3rem;
      text-align: center;
    }

    .setup-footer button {
      font-size: 1.1rem;
      padding: 1rem 2rem;
    }

    @media (max-width: 640px) {
      .setup-step {
        flex-direction: column;
      }

      .step-number {
        margin-bottom: 1rem;
      }
    }
  `;

  return createHtmlDocument(content, styles);
}