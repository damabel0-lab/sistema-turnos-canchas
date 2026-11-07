import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/** Tarjeta base estilo moderno (uiverse.io): fondo blanco, sombra suave, bordes redondeados */
export function Card({ children, className, padded = true }: CardProps) {
  return (
    <div
      className={[
        'relative rounded-2xl bg-white border border-gray-100 shadow-sm',
        padded ? 'p-6' : 'p-0',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
