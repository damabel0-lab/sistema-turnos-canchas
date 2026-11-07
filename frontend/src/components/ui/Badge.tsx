import type { CSSProperties } from 'react';

export interface BadgeProps {
  children: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  style?: CSSProperties;
}

const variantStyles: Record<string, string> = {
  neutral: 'badge-neutro',
  success: 'badge-exito',
  warning: 'badge-advertencia',
  danger: 'badge-peligro',
  info: 'badge-info',
};

/** Etiqueta de estado pequeña */
export function Badge({ children, variant = 'neutral', className, style }: BadgeProps) {
  const clases = `badge ${variantStyles[variant]}${className ? ' ' + className : ''}`;
  return <span className={clases} style={style}>{children}</span>;
}
