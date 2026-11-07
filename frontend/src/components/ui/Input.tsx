import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

/** Campo de entrada estilizado propio */
export function Input({ className, ...rest }: InputProps) {
  const clases = `input${className ? ' ' + className : ''}`;
  return <input className={clases} {...rest} />;
}
