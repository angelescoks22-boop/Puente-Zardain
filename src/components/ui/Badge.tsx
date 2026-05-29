type Props = {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'zardas' | 'level';
  style?: React.CSSProperties;
};

export function Badge({ children, variant = 'default', style }: Props) {
  return (
    <span className={`badge badge-${variant}`} style={style}>
      {children}
    </span>
  );
}
