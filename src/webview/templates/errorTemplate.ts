import { THEME } from '../../config';
import { Button } from '../components/button';
import { getBaseStyles } from '../styles/base';
import { createHtmlDocument } from '../utils/html';
import { icons } from '../utils/icons';

export function getErrorContent(
    title: string,
    messages: string[],
    showSetupButton: boolean = true,
): string {
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
              ${messages
                  .map(
                      (msg) => `
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
              `,
                  )
                  .join('')}
            </div>

            ${
                showSetupButton
                    ? `
              <div class="error-actions">
                ${Button({
                    onClick: 'openSetupGuide()',
                    children: 'Show Setup Guide',
                    icon: icons.setup,
                })}
                ${Button({
                    onClick: 'retryAnalysis()',
                    variant: 'primary',
                    children: 'Retry Analysis',
                    icon: icons.retry,
                })}
              </div>
            `
                    : ''
            }
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
