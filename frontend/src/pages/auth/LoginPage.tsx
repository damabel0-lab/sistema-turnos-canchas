import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, Input } from '../../components/ui';

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
    <main className="pantalla">
      <div className="contenedor-estrecho">
        <Card>
          <h1 className="titulo">{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

          <form onSubmit={enviar} className="stack">
            {modo === 'registrarse' && (
              <>
                <label className="label">Nombre<Input name="nombre" required /></label>
                <label className="label">Apellido<Input name="apellido" required /></label>
                <label className="label">Teléfono<Input name="telefono" /></label>
              </>
            )}

            <label className="label">Email<Input name="email" type="email" required /></label>
            <label className="label">Contraseña<Input name="password" type="password" required minLength={6} /></label>

            {error && <p style={{ color: '#dc2626' }}>{error}</p>}

            <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
              {cargando ? 'Cargando…' : modo === 'entrar' ? 'Entrar' : 'Registrarme'}
            </button>
          </form>

          <p className="texto-sec" style={{ marginTop: '1rem', textAlign: 'center' }}>
            {modo === 'entrar' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
            <button
              type="button"
              onClick={() => {
                setModo(modo === 'entrar' ? 'registrarse' : 'entrar');
                setError(null);
              }}
              className="boton boton-ghost"
            >
              {modo === 'entrar' ? 'Registrate' : 'Iniciá sesión'}
            </button>
          </p>
        </Card>
      </div>
    </main>
  );
}
