export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export function createHtmlDocument(content: string, styles: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${styles}</style>
      </head>
      <body>
        ${content}
        <script>
          const vscode = acquireVsCodeApi();
        </script>
      </body>
    </html>
  `;
};