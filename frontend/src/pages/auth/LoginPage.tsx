import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui';
import {
  Goal, CalendarCheck2, Wallet, Trophy, Eye, EyeOff,
  Users, ShieldCheck, Mail, CheckCircle2,
} from 'lucide-react';

type Modo = 'entrar' | 'registrarse' | 'olvidar';

export function LoginPage() {
  const { entrar, registrarse, olvidéContraseña } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Adonde quería ir el usuario antes de loguearse (ej: /reservar). Solo rutas internas.
  const estadoDesde = (location.state as { desde?: string } | null)?.desde;
  const destino = estadoDesde && estadoDesde.startsWith('/') ? estadoDesde : '/';
  // Si la URL es /login?modo=dueño, abre en registro y preselecciona rol dueño
  const params = new URLSearchParams(location.search);
  const modoInicial = (params.get('modo') as Modo | null) ?? 'entrar';
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [tipoRegistro, setTipoRegistro] = useState<'jugador' | 'dueno'>(params.get('tipo') === 'dueno' ? 'dueno' : 'jugador');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviadoRecovery, setEnviadoRecovery] = useState(false);
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
      } else if (modo === 'registrarse') {
        await registrarse({
          email,
          password,
          nombre: String(form.get('nombre')),
          apellido: String(form.get('apellido')),
          telefono: String(form.get('telefono') ?? '') || undefined,
        });
        // Auto-navegar: dueño → wizard de configuración, jugador → destino normal
        if (tipoRegistro === 'dueno') {
          navigate('/registra-tu-complejo', { replace: true });
          return;
        }
      } else if (modo === 'olvidar') {
        await olvidéContraseña(email);
        setEnviadoRecovery(true);
        return;
      }
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  const titulos: Record<Modo, string> = {
    entrar: 'Bienvenido de nuevo',
    registrarse: 'Creá tu cuenta',
    olvidar: '¿Olvidaste tu contraseña?',
  };

  const subs: Record<Modo, string> = {
    entrar: vieneDeReservar
      ? 'Ingresá para completar tu reserva.'
      : 'Ingresá para reservar y gestionar tu cuenta.',
    registrarse: tipoRegistro === 'dueno'
      ? 'Publicá tu complejo y administrás turnos, caja y torneos desde tu panel.'
      : 'Registrate gratis y reservá tu primer turno en minutos.',
    olvidar: 'Te mandamos un link al email con el que te registraste.',
  };

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
          <h1 className="titulo" style={{ fontSize: '1.5rem', marginBottom: '0.1rem' }}>
            {titulos[modo]}
          </h1>
          <p className="subtitulo" style={{ marginBottom: '1.25rem' }}>
            {subs[modo]}
          </p>

          {/* ===== Modo olvidar ===== */}
          {modo === 'olvidar' && enviadoRecovery ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.3rem 1rem' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--exito)', margin: '0 auto 0.5rem' }} />
              <h3 className="titulo" style={{ margin: '0 0 0.3rem' }}>Revisá tu email</h3>
              <p className="texto-sec" style={{ margin: '0 0 0.5rem' }}>
                Si el email existe en PlayControl, vas a recibir un link para restablecer tu contraseña en unos minutos.
              </p>
              <button type="button" className="boton boton-ghost" onClick={() => { setModo('entrar'); setEnviadoRecovery(false); }}>
                Volver a entrar
              </button>
            </div>
          ) : modo === 'olvidar' ? (
            <form onSubmit={enviar} className="stack">
              <label className="label">Email
                <Input name="email" type="email" required autoComplete="email" placeholder="vos@email.com" autoFocus />
              </label>

              {error && <div className="alerta-error" role="alert" style={{ marginBottom: 0 }}>{error}</div>}

              <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
                {cargando ? 'Enviando…' : <><Mail size={16} /> Enviar link de recuperación</>}
              </button>

              <button type="button" className="boton boton-ghost" onClick={() => { setModo('entrar'); setError(null); }}>
                ← Volver a entrar
              </button>
            </form>
          ) : (
            <>
              {/* ===== Selector de rol al registrarse ===== */}
              {modo === 'registrarse' && (
                <div className="stack" style={{ gap: '0.45rem', marginBottom: '0.85rem' }}>
                  <span className="label" style={{ margin: 0 }}>¿Cómo vas a usar PlayControl?</span>
                  <div role="radiogroup" aria-label="Tipo de cuenta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { valor: 'jugador' as const, icon: Users, titulo: 'Jugador', sub: 'Quiero reservar cancha' },
                      { valor: 'dueno' as const, icon: ShieldCheck, titulo: 'Dueño', sub: 'Administro el complejo' },
                    ].map(({ valor, icon: Icon, titulo, sub }) => {
                      const activo = tipoRegistro === valor;
                      return (
                        <label
                          key={valor}
                          className={`rol-opcion${activo ? ' activo' : ''}`}
                          style={{
                            display: 'grid',
                            justifyItems: 'center',
                            gap: '0.25rem',
                            padding: '0.55rem 0.5rem',
                            border: `1.5px solid ${activo ? 'var(--primario)' : 'var(--border)'}`,
                            borderRadius: 'var(--radio-lg, 12px)',
                            background: activo ? 'var(--primario-soft)' : 'var(--bg-surface-2)',
                            cursor: 'pointer',
                            transition: 'border-color 0.18s ease, background 0.18s ease',
                          }}
                        >
                          <input
                            type="radio"
                            name="tipoRegistro"
                            value={valor}
                            checked={activo}
                            onChange={() => setTipoRegistro(valor)}
                            style={{ position: 'absolute', opacity: 0 }}
                          />
                          <Icon size={22} style={{ color: activo ? 'var(--primario-2)' : 'var(--texto-2)' }} />
                          <strong style={{ fontSize: '0.9rem' }}>{titulo}</strong>
                          <span className="texto-debil" style={{ fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.25 }}>{sub}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={enviar} className="stack">
                {modo === 'registrarse' && (
                  <div className="grid-2" style={{ gap: '0.6rem' }}>
                    <label className="label">Nombre<Input name="nombre" required autoComplete="given-name" placeholder="Nahuel" autoFocus /></label>
                    <label className="label">Apellido<Input name="apellido" required autoComplete="family-name" placeholder="Gauna" /></label>
                    <label className="label" style={{ gridColumn: '1 / -1' }}>Teléfono<Input name="telefono" autoComplete="tel" placeholder="+54 9 11 0000-0000" /></label>
                  </div>
                )}

                <label className="label">Email
                  <Input name="email" type="email" required autoComplete="email" placeholder="vos@email.com" autoFocus={modo === 'entrar'} />
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

                {/* Olvidé mi contraseña (solo en modo entrar) */}
                {modo === 'entrar' && (
                  <div className="fila-entre" style={{ marginTop: '-0.2rem' }}>
                    <span />
                    <button
                      type="button"
                      onClick={() => { setModo('olvidar'); setError(null); }}
                      className="boton boton-ghost"
                      style={{ fontSize: '0.82rem', padding: '0.2rem 0.5rem', color: 'var(--primario-2)', fontWeight: 600 }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                {error && <div className="alerta-error" role="alert" style={{ marginBottom: 0 }}>{error}</div>}

                <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
                  {cargando
                    ? (modo === 'entrar' ? 'Entrando…' : 'Creando cuenta…')
                    : modo === 'entrar' ? 'Entrar' : tipoRegistro === 'dueno' ? 'Crear mi cuenta y registrar mi complejo' : 'Crear cuenta y reservar'}
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
            </>
          )}
        </div>
      </section>
    </main>
  );
}
