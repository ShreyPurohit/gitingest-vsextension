import { ThemeColors } from '../../types';
import { THEME } from '../../config';

export const getBaseStyles = (theme: ThemeColors = THEME) => `
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

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  .loading-content {
    width: 100%;
    max-width: 500px;
    text-align: center;
  }

  .loader-wrapper {
    margin-bottom: 2rem;
  }

  .loading-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 1rem 0;
    color: #1a1a1a;
  }

  .loader {
    border: 4px solid #fff4da;
    border-top: 4px solid #ffc480;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  .status-container {
    margin: 2rem 0;
  }

  .status-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    border-radius: 8px;
    background: #fff4da;
    border: 2px solid #1a1a1a;
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  .status-item:hover {
    transform: translateY(-1px);
  }

  .status-item.success {
    color: #27ae60;
  }

  .status-item.error {
    color: ${theme.danger};
  }

  .status-item.warning {
    color: #f39c12;
  }

  .status-item.info {
    color: #3498db;
  }

  .status-icon {
    display: flex;
    align-items: center;
  }

  .status-text {
    font-weight: 500;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .inner-content {
    background: #fff4da;
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
    padding: 12px 24px;
    cursor: pointer;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
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

  .section-shadow-wrapper {
    position: relative;
    margin-bottom: 16px;
  }

  .section-shadow-wrapper::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #1a1a1a;
    border-radius: 8px;
    transform: translate(2px, 2px);
    z-index: 10;
  }

  .content-box {
    background: #fff4da;
    border: 3px solid #1a1a1a;
    border-radius: 8px;
    padding: 16px;
    position: relative;
    z-index: 20;
    display: flex;
    flex-direction: column;
    height: 100%;
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
    position: relative;
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    border: 3px solid #1a1a1a;
    border-radius: 4px;
    background: #fff4da;
  }

  .scrollable-content pre {
    border: none;
    margin: 0;
    height: 100%;
  }

  .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  .error-content {
    width: 100%;
    max-width: 500px;
    text-align: center;
  }

  .error-icon {
    color: ${theme.danger};
    margin-bottom: 1.5rem;
  }

  .error-title {
    font-size: 1.75rem;
    font-weight: 600;
    color: ${theme.danger};
    margin-bottom: 1.5rem;
  }

  .error-messages {
    margin: 2rem 0;
  }

  .error-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    border-radius: 8px;
    background: #fff4da;
    border: 2px solid #1a1a1a;
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  .error-message:hover {
    transform: translateY(-1px);
  }

  .error-message-icon {
    display: flex;
    align-items: center;
    color: ${theme.danger};
  }

  .error-message-text {
    font-weight: 500;
    color: #1a1a1a;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }
`;