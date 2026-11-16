import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui';
import {
  Goal, CalendarCheck2, Wallet, Trophy, Eye, EyeOff,
  Users, ShieldCheck, Mail,
} from 'lucide-react';

type Modo = 'entrar' | 'registrarse' | 'olvidar';

export function LoginPage() {
  const { entrar, registrarse, olvidéContraseña, resetPasswordFromHash } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Adonde quería ir el usuario antes de loguearse (ej: /reservar). Solo rutas internas.
  const estadoDesde = (location.state as { desde?: string } | null)?.desde;
  const destino = estadoDesde && estadoDesde.startsWith('/') ? estadoDesde : '/';
  // Estado compartido via query string: ?modo=entrar|registrarse|olvidar&tipo=jugador|dueno
  const [searchParams, setSearchParams] = useSearchParams();
  const modo = ((searchParams.get('modo') as Modo | null) ?? 'entrar');
  const tipoRegistro = (searchParams.get('tipo') === 'dueno' ? 'dueno' : 'jugador');

  const setModo = (m: Modo, tipo?: 'jugador' | 'dueno') => {
    const params = new URLSearchParams(searchParams);
    params.set('modo', m);
    if (m === 'registrarse') params.set('tipo', tipo ?? tipoRegistro);
    else params.delete('tipo');
    setSearchParams(params, { replace: true });
  };
  const setTipoRegistro = (t: 'jugador' | 'dueno') => {
    const params = new URLSearchParams(searchParams);
    params.set('modo', 'registrarse');
    params.set('tipo', t);
    setSearchParams(params, { replace: true });
  };
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [olvidarPaso, setOlvidarPaso] = useState<1 | 2 | 3>(1);
  const [olvidarEmail, setOlvidarEmail] = useState('');
  const [olvidarCodigo, setOlvidarCodigo] = useState('');
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
    olvidar: 'Te enviamos un código de 6 dígitos a tu email para restablecer tu contraseña.',
  };

  const pasoOlvidarTitulos: Record<1 | 2 | 3, string> = {
    1: '¿Olvidaste tu contraseña?',
    2: 'Revisá tu email',
    3: 'Elegí tu nueva contraseña',
  };

  const pasoOlvidarSubs: Record<1 | 2 | 3, string> = {
    1: 'Ingresá tu email y te mandamos un código de 6 dígitos.',
    2: `Escribimos un código de 6 dígitos a ${olvidarEmail || 'tu email'}. Ingresalo abajo para continuar.`,
    3: 'La contraseña debe tener al menos 6 caracteres.',
  };

  return (
    <main className="auth-pantalla">
      {/* Panel lateral de marca, copy según rol: jugador (default) | complejo */}
      <aside className="auth-aside" aria-hidden>
        <div className="auth-aside-inner">
          <div className="auth-brand">
            <span className="brand-mark brand-mark-lg">
              <Goal size={26} strokeWidth={2.2} />
            </span>
            <span className="auth-brand-nombre">PlayControl</span>
          </div>
          {modo === 'registrarse' && tipoRegistro === 'dueno' ? (
            <>
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
            </>
          ) : (
            <>
              <h2 className="auth-aside-titulo">
                Tu próximo partido<br />
                empieza acá.
              </h2>
              <p className="auth-aside-sub">
                Encontrá canchas disponibles en tu zona, reservá en segundos y organizá tus partidos sin vueltas.
              </p>
              <ul className="auth-bullets">
                <li><CalendarCheck2 size={17} /> Reserva gratuita y confirmación al instante</li>
                <li><Wallet size={17} /> Disponibilidad real por deporte y horario</li>
                <li><Trophy size={17} /> Gestiona tus turnos y favoritos desde un solo lugar</li>
              </ul>
            </>
          )}
        </div>
      </aside>

      {/* Panel del formulario */}
      <section className="auth-form-panel">
        <div className="auth-form-card">
          <h1 className="titulo" style={{ fontSize: '1.5rem', marginBottom: '0.1rem' }}>
            {modo === 'olvidar' ? pasoOlvidarTitulos[olvidarPaso] : titulos[modo]}
          </h1>
          <p className="subtitulo" style={{ marginBottom: '1.25rem' }}>
            {modo === 'olvidar' ? pasoOlvidarSubs[olvidarPaso] : subs[modo]}
          </p>

          {/* ===== Modo olvidar (mock visual — no hay SMTP, no se envía nada) ===== */}
          {modo === 'olvidar' ? (
            <>
              {/* Indicador de progreso 3 pasos */}
              <ol className="auth-pasos" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <li
                    key={n}
                    className={`auth-paso${olvidarPaso === n ? ' activo' : ''}${olvidarPaso > n ? ' hecho' : ''}`}
                  >
                    <span className="auth-paso-num">{olvidarPaso > n ? '✓' : n}</span>
                    <span className="auth-paso-label">{n === 1 ? 'Email' : n === 2 ? 'Código' : 'Nueva clave'}</span>
                  </li>
                ))}
              </ol>

              {/* Paso 1 — email */}
              {olvidarPaso === 1 && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!olvidarEmail.trim()) { setError('Ingresá tu email.'); return; }
                  setCargando(true);
                  void olvidéContraseña(olvidarEmail)
                    .then(() => { setOlvidarPaso(2); setError(null); })
                    .catch(() => setError('No se pudo procesar el pedido.'))
                    .finally(() => setCargando(false));
                }} className="stack">
                  <label className="label">Email
                    <Input name="email" type="email" required autoComplete="email" placeholder="vos@email.com" value={olvidarEmail} onChange={(e) => setOlvidarEmail(e.target.value)} autoFocus />
                  </label>

                  {error && <div className="alerta-error" role="alert" style={{ marginBottom: 0 }}>{error}</div>}

                  <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
                    {cargando ? 'Enviando código…' : <><Mail size={16} /> Enviarme el código</>}
                  </button>

                  <button type="button" className="boton boton-ghost" onClick={() => { setModo('entrar'); setError(null); setOlvidarPaso(1); }}>
                    ← Volver a entrar
                  </button>
                </form>
              )}

              {/* Paso 2 — código de 6 dígitos */}
              {olvidarPaso === 2 && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (olvidarCodigo.length !== 6) { setError('Ingresá el código de 6 dígitos.'); return; }
                  setCargando(true);
                  window.setTimeout(() => { setOlvidarPaso(3); setError(null); setCargando(false); }, 450);
                }} className="stack">
                  <label className="label">Código de 6 dígitos
                    <Input
                      name="codigo"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      placeholder="123 456"
                      value={olvidarCodigo}
                      onChange={(e) => setOlvidarCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.35rem', fontWeight: 800 }}
                      autoFocus
                    />
                  </label>

                  {error && <div className="alerta-error" role="alert" style={{ marginBottom: 0 }}>{error}</div>}

                  <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
                    {cargando ? 'Verificando…' : 'Verificar código'}
                  </button>

                  <button type="button" className="boton boton-ghost" onClick={() => { setOlvidarPaso(1); setError(null); }}>
                    ← Volver
                  </button>
                </form>
              )}

              {/* Paso 3 — nueva contraseña */}
              {olvidarPaso === 3 && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const pass = String(form.get('password') ?? '');
                  const confirmacion = String(form.get('confirmar') ?? '');
                  if (pass.length < 6) { setError('La clave debe tener al menos 6 caracteres.'); return; }
                  if (pass !== confirmacion) { setError('Las claves no coinciden.'); return; }
                  setCargando(true);
                  void resetPasswordFromHash(pass)
                    .then(() => { setOlvidarPaso(1); setOlvidarEmail(''); setOlvidarCodigo(''); setModo('entrar'); setError(null); })
                    .catch(() => setError('No se pudo guardar la nueva contraseña.'))
                    .finally(() => setCargando(false));
                }} className="stack">
                  <label className="label">Nueva contraseña
                    <Input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" autoFocus />
                  </label>
                  <label className="label">Confirmar contraseña
                    <Input name="confirmar" type="password" required minLength={6} autoComplete="new-password" placeholder="Repetila" />
                  </label>

                  {error && <div className="alerta-error" role="alert" style={{ marginBottom: 0 }}>{error}</div>}

                  <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
                    {cargando ? 'Guardando…' : 'Restablecer contraseña'}
                  </button>

                  <button type="button" className="boton boton-ghost" onClick={() => { setOlvidarPaso(2); setError(null); }}>
                    ← Volver
                  </button>
                </form>
              )}
            </>
          ) : (
            <>              {/* ===== Selector de rol al registrarse ===== */}
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
