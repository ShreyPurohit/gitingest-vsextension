import { THEME } from '../../config';
import { Button } from '../components/button';
import { Section } from '../components/section';
import { getBaseStyles } from '../styles/base';
import { createHtmlDocument, escapeHtml } from '../utils/html';
import { icons } from '../utils/icons';

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