interface ButtonProps {
  onClick: string;
  variant?: 'primary' | 'danger';
  icon?: string;
  children: string;
}

export function Button({ onClick, variant = 'primary', icon, children }: ButtonProps): string {
  const baseClasses = 'button';
  const variantClasses = {
    primary: 'primary-button',
    danger: 'danger-button'
  };

  const className = variant === 'danger'
    ? variantClasses.danger
    : variantClasses.primary;

  return `
    <button class="${baseClasses} ${className}" onclick="${onClick}">
      ${icon ? `
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${icon}
        </svg>
      ` : ''}
      ${children}
    </button>
  `;
}