import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

/** Campo de entrada con focus suave y bordes redondeados */
export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={[
        'flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
