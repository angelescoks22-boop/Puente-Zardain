import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: boolean;
};

export function Card({ children, className = '', onClick, padding = true }: Props) {
  return (
    <div
      className={`card ${padding ? 'card-padded' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
