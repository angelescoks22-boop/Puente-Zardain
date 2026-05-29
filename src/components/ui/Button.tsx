import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} btn-animated ${fullWidth ? 'btn-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
