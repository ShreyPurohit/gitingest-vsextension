import { ThemeColors, StatusMessage } from '../types';
import { THEME } from '../config';

const getBaseStyles = (theme: ThemeColors = THEME) => `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    padding: 20px;
    color: ${theme.text};
    line-height: 1.6;
    background-color: rgb(255 253 248);
  }
  button { 
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
    z-index: 20;
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
  .relative {
    position: relative;
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
    background: rgb(250 250 250);
    border: 3px solid #1a1a1a;
    border-radius: 12px;
    padding: 24px;
    position: relative;
    z-index: 20;
  }
  .inner-content {
    background: rgb(255 244 218);
    border: 3px solid #1a1a1a;
    border-radius: 12px;
    padding: 24px;
    position: relative;
  }
  input, textarea {
    border: 3px solid #1a1a1a;
    border-radius: 4px;
    padding: 8px 12px;
    width: 100%;
    background: white;
    position: relative;
    z-index: 20;
  }
  textarea {
    background: rgb(255 244 218);
    min-height: 150px;
    resize: vertical;
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
    border: 4px solid rgb(255 244 218);
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
            <button class="danger-button" onclick="vscode.postMessage({ command: 'cancel' })">
              Cancel Analysis
            </button>
          </div>
        </div>
      </div>
    </body>
    </html>`;
}

export function getErrorContent(title: string, messages: string[], showSetupButton: boolean = false): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="shadow-wrapper">
        <div class="content-wrapper">
          <div class="inner-content">
            <h2 class="text-2xl font-bold text-red-600 mb-4">${title}</h2>
            ${messages.map(msg => `<div class="status error">${msg}</div>`).join('')}
            ${showSetupButton ? `
              <button class="primary-button" onclick="vscode.postMessage({ command: 'showSetup' })">
                Show Setup Guide
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </body>
    </html>`;
}

export function getResultsContent(output: string): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="shadow-wrapper">
        <div class="content-wrapper">
          <div class="inner-content">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold">Analysis Results</h2>
              <button class="primary-button" onclick="vscode.postMessage({ command: 'copy', text: document.querySelector('pre').textContent })">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Output
                </div>
              </button>
            </div>
            <div class="relative">
              <div class="w-full h-full absolute inset-0 bg-black rounded translate-y-1 translate-x-1"></div>
              <pre class="whitespace-pre-wrap font-mono text-sm p-4 bg-[rgb(255,244,218)] border-[3px] border-gray-900 rounded relative z-10">${output}</pre>
            </div>
          </div>
        </div>
      </div>
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
            <h1 class="text-3xl font-bold mb-8 text-[#FE4A60]">GitIngest Setup Guide</h1>
            
            <div class="mb-8 p-6 bg-[rgb(255,244,218)] rounded-lg border-[3px] border-gray-900 relative">
              <div class="w-full h-full absolute inset-0 bg-black rounded-lg translate-y-2 translate-x-2 -z-10"></div>
              <h2 class="text-xl font-bold mb-4">1. Install Python</h2>
              <p class="mb-4">First, make sure you have Python installed on your system:</p>
              <ul class="list-disc pl-6 space-y-2">
                <li>Download Python from <a href="https://python.org" class="text-[#6e5000] hover:underline">python.org</a></li>
                <li>During installation, make sure to check "Add Python to PATH"</li>
                <li>Verify installation by running <code class="bg-[#e6e8eb] px-2 py-1 rounded">python --version</code> or <code class="bg-[#e6e8eb] px-2 py-1 rounded">python3 --version</code></li>
              </ul>
            </div>

            <div class="mb-8 p-6 bg-[rgb(255,244,218)] rounded-lg border-[3px] border-gray-900 relative">
              <div class="w-full h-full absolute inset-0 bg-black rounded-lg translate-y-2 translate-x-2 -z-10"></div>
              <h2 class="text-xl font-bold mb-4">2. Install GitIngest</h2>
              <p class="mb-4">Once Python is installed, you can install GitIngest using pip:</p>
              <code class="block bg-[#e6e8eb] p-3 rounded mb-4">pip install gitingest</code>
              <p>Or if you're on Unix-like systems:</p>
              <code class="block bg-[#e6e8eb] p-3 rounded">pip3 install gitingest</code>
            </div>

            <div class="p-6 bg-[rgb(255,244,218)] rounded-lg border-[3px] border-gray-900 relative">
              <div class="w-full h-full absolute inset-0 bg-black rounded-lg translate-y-2 translate-x-2 -z-10"></div>
              <h2 class="text-xl font-bold mb-4">3. Usage</h2>
              <p class="mb-4">After installation:</p>
              <ol class="list-decimal pl-6 space-y-2">
                <li>Open a Git repository in VS Code</li>
                <li>Use the command palette (Ctrl/Cmd + Shift + P)</li>
                <li>Search for "GitIngest: Analyze Repository"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>`;
}