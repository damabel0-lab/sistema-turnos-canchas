import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Goal, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui';

/** Página destino del link de recuperación: leerá la sesión recovery y permite cambiar la contraseña. */
export function RecuperarClavePage() {
  const { resetPasswordFromHash } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // Tras abrir el link, Supabase guarda la sesión recovery automáticamente; solo verificación
    const hash = location.hash || window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token')) return;
    // Si no hay hash de recuperación, no podemos cambiar contraseña
  }, [location.hash]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await resetPasswordFromHash(password);
      setListo(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="auth-pantalla">
      <section className="auth-form-panel">
        <div className="auth-form-card" style={{ maxWidth: '26rem' }}>
          <span className="brand-mark brand-mark-lg"><Goal size={22} strokeWidth={2.2} /></span>
          <h1 className="titulo" style={{ fontSize: '1.4rem', margin: '0.4rem 0 0.15rem' }}>
            Restablecer contraseña
          </h1>
          <p className="subtitulo" style={{ marginBottom: '1.1rem' }}>
            Ingresá tu nueva contraseña dos veces.
          </p>

          {listo ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.4rem 1rem' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--exito)', margin: '0 auto 0.5rem' }} />
              <h3 className="titulo" style={{ margin: '0 0 0.3rem' }}>¡Listo!</h3>
              <p className="texto-sec" style={{ margin: 0 }}>Tu contraseña fue restablecida. Te llevamos al login…</p>
            </div>
          ) : (
            <form onSubmit={enviar} className="stack">
              <label className="label">Nueva contraseña
                <span style={{ position: 'relative', display: 'block' }}>
                  <Input
                    type={verPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ paddingRight: '2.4rem' }}
                    autoFocus
                  />
                  <button type="button" onClick={() => setVerPassword((v) => !v)} aria-label={verPassword ? 'Ocultar' : 'Mostrar'}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--texto-3)', display: 'flex', padding: '0.3rem' }}>
                    {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              <label className="label">Confirmar contraseña
                <Input
                  type="password"
                  name="confirmar"
                  required
                  minLength={6}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repetila"
                />
              </label>

              {error && <div className="alerta-error" role="alert" style={{ margin: 0 }}>{error}</div>}

              <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
              <Link to="/login" className="texto-sec" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                Volver al login
              </Link>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
