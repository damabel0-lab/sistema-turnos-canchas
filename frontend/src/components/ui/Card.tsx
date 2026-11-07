import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Si es true, la tarjeta no agrega contenedor interno (usás tu propio div con padding) */
  plano?: boolean;
}

/** Tarjeta estilo moderno (uiverse.io): fondo blanco, bordes redondeados, sombra sutil */
export function Card({ children, className, plano = false }: CardProps) {
  const clase = `${plano ? 'tarjeta-plana' : 'tarjeta'}${className ? ' ' + className : ''}`;
  return <div className={clase}>{children}</div>;
}
