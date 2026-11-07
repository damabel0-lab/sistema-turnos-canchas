import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'asChild'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  className?: string;
  asChild?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'boton-primario',
  secondary: 'boton-secundario',
  ghost: 'boton-ghost',
  danger: 'boton-danger',
  outline: 'boton-outline',
};

/** Botón moderno: bordes redondeados, colores suaves de la paleta */
export function Button({
  variant = 'primary',
  className,
  disabled,
  asChild,
  children,
  ...rest
}: ButtonProps) {
  const clases = `boton ${variantStyles[variant]}${disabled ? ' boton-disabled' : ''}${className ? ' ' + className : ''}`;
  const Comp = asChild ? ({ children: c, ...props }: any) => (
    <span {...props}>{c}</span>
  ) : 'button';

  return (
    <Comp className={clases} disabled={disabled} {...rest}>
      {children}
    </Comp>
  );
}
