import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui';
import { Goal, CalendarCheck2, Wallet, Trophy, Eye, EyeOff } from 'lucide-react';

type Modo = 'entrar' | 'registrarse';

export function LoginPage() {
  const { entrar, registrarse } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Adonde quería ir el usuario antes de loguearse (ej: /reservar). Solo rutas internas.
  const estadoDesde = (location.state as { desde?: string } | null)?.desde;
  const destino = estadoDesde && estadoDesde.startsWith('/') ? estadoDesde : '/';
  const [modo, setModo] = useState<Modo>('entrar');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verPassword, setVerPassword] = useState(false);
  const vieneDeReservar = destino === '/reservar';

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
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="auth-pantalla">
      {/* Panel lateral de marca (en mobile se oculta) */}
      <aside className="auth-aside" aria-hidden>
        <div className="auth-aside-inner">
          <div className="auth-brand">
            <span className="brand-mark brand-mark-lg">
              <Goal size={26} strokeWidth={2.2} />
            </span>
            <span className="auth-brand-nombre">PlayControl</span>
          </div>
          <h2 className="auth-aside-titulo">
            El complejo,
            <br />
            bajo control.
          </h2>
          <p className="auth-aside-sub">
            Reservas, caja, socios, abonos y torneos — todo el club en un solo lugar.
          </p>
          <ul className="auth-bullets">
            <li><CalendarCheck2 size={17} /> Grilla en tiempo real, turnos fijos de 1 h</li>
            <li><Wallet size={17} /> Caja, seña y recaudación del día</li>
            <li><Trophy size={17} /> Torneos y abonos para socios</li>
          </ul>
        </div>
      </aside>

      {/* Panel del formulario */}
      <section className="auth-form-panel">
        <div className="auth-form-card">
          <h1 className="titulo" style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>
            {modo === 'entrar' ? 'Bienvenido de nuevo' : 'Creá tu cuenta'}
          </h1>
          <p className="subtitulo" style={{ marginBottom: '1.25rem' }}>
            {modo === 'entrar'
              ? vieneDeReservar
                ? 'Ingresá para completar tu reserva.'
                : 'Ingresá para reservar y gestionar tu cuenta.'
              : vieneDeReservar
                ? 'Creá tu cuenta y reservá tu primer turno.'
                : 'Registrate para reservar tu turno.'}
          </p>

          <form onSubmit={enviar} className="stack">
            {modo === 'registrarse' && (
              <div className="grid-2" style={{ gap: '0.6rem' }}>
                <label className="label">Nombre<Input name="nombre" required autoComplete="given-name" placeholder="Nahuel" /></label>
                <label className="label">Apellido<Input name="apellido" required autoComplete="family-name" placeholder="Gauna" /></label>
                <label className="label" style={{ gridColumn: '1 / -1' }}>Teléfono<Input name="telefono" autoComplete="tel" placeholder="+54 9 11 0000-0000" /></label>
              </div>
            )}

            <label className="label">Email
              <Input name="email" type="email" required autoComplete="email" placeholder="vos@email.com" />
            </label>
            <label className="label">Contraseña
              <span style={{ position: 'relative', display: 'block' }}>
                <Input
                  name="password"
                  type={verPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                  placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight: '2.4rem' }}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  style={{
                    position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--texto-3)',
                    display: 'flex', alignItems: 'center', padding: '0.3rem',
                  }}
                >
                  {verPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error && <div className="alerta-error" role="alert" style={{ marginBottom: 0 }}>{error}</div>}

            <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
              {cargando ? 'Cargando…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <p className="texto-sec" style={{ marginTop: '1.1rem', textAlign: 'center', fontSize: '0.88rem' }}>
            {modo === 'entrar' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
            <button
              type="button"
              onClick={() => {
                setModo(modo === 'entrar' ? 'registrarse' : 'entrar');
                setError(null);
              }}
              className="boton boton-ghost"
              style={{ fontSize: '0.88rem', padding: '0.2rem 0.5rem' }}
            >
              {modo === 'entrar' ? 'Registrate' : 'Iniciá sesión'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
