import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/** Botón para alternar entre modo claro y oscuro */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const esOscuro = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {esOscuro ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
