interface SectionProps {
    title: string;
    content: string;
    copyButton?: boolean;
    copyFunction?: string;
}

export function Section({ title, content, copyButton = true, copyFunction }: SectionProps): string {
    return `
    <div>
      <div class="section-header">
        <h3 class="section-title">${title}</h3>
        ${
            copyButton
                ? `
          <button class="primary-button" onclick="${copyFunction || ''}">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy
          </button>
        `
                : ''
        }
      </div>
      <div class="section-shadow-wrapper">
        <div class="content-box">
          <div class="scrollable-content">
            <pre>${content}</pre>
          </div>
        </div>
      </div>
    </div>
  `;
}
