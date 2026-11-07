import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type Modo = 'entrar' | 'registrarse';

export function LoginPage() {
  const { entrar, registrarse } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>('entrar');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));

    try {
      if (modo === 'entrar') {
        await entrar(email, password);
      } else {
        await registrarse({
          email,
          password,
          nombre: String(form.get('nombre')),
          apellido: String(form.get('apellido')),
          telefono: String(form.get('telefono') ?? '') || undefined,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '40px auto', padding: 16 }}>
      <h1>{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

      <form onSubmit={enviar} style={{ display: 'grid', gap: 12 }}>
        {modo === 'registrarse' && (
          <>
            <label>
              Nombre
              <input name="nombre" required style={{ width: '100%' }} />
            </label>
            <label>
              Apellido
              <input name="apellido" required style={{ width: '100%' }} />
            </label>
            <label>
              Teléfono
              <input name="telefono" style={{ width: '100%' }} />
            </label>
          </>
        )}

        <label>
          Email
          <input name="email" type="email" required style={{ width: '100%' }} />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" required minLength={6} style={{ width: '100%' }} />
        </label>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Cargando…' : modo === 'entrar' ? 'Entrar' : 'Registrarme'}
        </button>
      </form>

      <p>
        {modo === 'entrar' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
        <button
          type="button"
          onClick={() => {
            setModo(modo === 'entrar' ? 'registrarse' : 'entrar');
            setError(null);
          }}
        >
          {modo === 'entrar' ? 'Registrate' : 'Iniciá sesión'}
        </button>
      </p>
    </main>
  );
}
