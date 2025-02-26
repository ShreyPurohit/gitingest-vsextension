import { THEME } from '../../config';
import { StatusMessage } from '../../types';
import { Button } from '../components/button';
import { getBaseStyles } from '../styles/base';
import { createHtmlDocument } from '../utils/html';
import { getStatusIcon } from '../utils/statusIcons';

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