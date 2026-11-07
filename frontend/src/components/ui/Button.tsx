import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'asChild'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  className?: string;
  asChild?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

/** Botón moderno con variantes y efecto hover sutil */
export function Button({
  variant = 'primary',
  className,
  disabled,
  asChild,
  children,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? ({ children: c, ...props }: any) => (
    <span {...props}>{c}</span>
  ) : 'button';

  return (
    <Comp
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200',
        disabled ? 'opacity-50 cursor-not-allowed' : variantStyles[variant],
        className,
      ].filter(Boolean).join(' ')}
      disabled={disabled}
      {...rest}
    >
      {children}
    </Comp>
  );
}
