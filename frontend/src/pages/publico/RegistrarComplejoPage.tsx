import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Goal, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useComplejo } from '../../hooks/useComplejo';
import { Input } from '../../components/ui';

/** Alta self-service: un usuario registrado crea su complejo y queda como DUEÑO con 14 días de prueba. */
export function RegistrarComplejoPage() {
  const navigate = useNavigate();
  const { recargar, seleccionar } = useComplejo();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const form = new FormData(e.currentTarget);
    const nombre = String(form.get('nombre') ?? '').trim();
    const ciudad = String(form.get('ciudad') ?? '').trim();
    if (nombre.length < 2) {
      setError('Poné el nombre del complejo.');
      setCargando(false);
      return;
    }
    if (ciudad.length < 2) {
      setError('Poné la ciudad del complejo (para que tus jugadores te encuentren).');
      setCargando(false);
      return;
    }

    const amenidades = String(form.get('amenidades') ?? '')
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);

    try {
      const creado = await api<{ id: number; slug: string }>('/complejos', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          tipo: String(form.get('tipo') || 'complejo_deportivo'),
          ciudad,
          direccion: String(form.get('direccion') ?? '').trim() || null,
          telefono: String(form.get('telefono') ?? '').trim() || null,
          email_contacto: String(form.get('email_contacto') ?? '').trim() || null,
          descripcion: String(form.get('descripcion') ?? '').trim() || null,
          gym: form.get('gym') === 'on',
          pileta: form.get('pileta') === 'on',
          ofrece_socios: form.get('ofrece_socios') === 'on',
          amenidades,
        }),
      });
      await recargar();
      seleccionar(creado.id, creado.slug);
      navigate('/admin/configuracion', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el complejo');
      setCargando(false);
    }
  }

  return (
    <main className="contenedor" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: '44rem' }}>
      <button type="button" className="fila" style={{ gap: '0.4rem', marginBottom: '0.85rem', color: 'var(--texto-2)' }} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Volver
      </button>

      <header style={{ marginBottom: '1rem' }}>
        <div className="fila" style={{ gap: '0.6rem' }}>
          <span className="brand-mark"><Goal size={18} strokeWidth={2.2} /></span>
          <span className="pagina-eyebrow" style={{ margin: 0 }}>Para dueños</span>
        </div>
        <h1 className="titulo" style={{ fontSize: '1.7rem', margin: '0.5rem 0 0.25rem' }}>
          Publicá tu complejo en PlayControl
        </h1>
        <p className="subtitulo" style={{ margin: 0 }}>
          Jugadores te eligen, reservan y pagan; vos administrás turnos, caja, socios, abonos y torneos desde un panel.
          Empezás con <strong>14 días gratis</strong>.
        </p>
      </header>

      <form onSubmit={enviar} className="card stack" style={{ padding: '1.25rem' }}>
        <div className="grid-2" style={{ gap: '0.7rem' }}>
          <label className="label" style={{ gridColumn: '1 / -1' }}>Nombre del complejo *
            <Input name="nombre" required minLength={2} placeholder="Club de Amigo 1886" autoFocus />
          </label>

          <label className="label">Tipo *
            <select name="tipo" className="input" defaultValue="complejo_deportivo">
              <option value="complejo_deportivo">Complejo deportivo</option>
              <option value="fraccionado">Fraccionado</option>
            </select>
          </label>
          <label className="label">Ciudad *
            <Input name="ciudad" required placeholder="La Plata" />
          </label>

          <label className="label" style={{ gridColumn: '1 / -1' }}>Dirección
            <Input name="direccion" placeholder="Calle y número" />
          </label>
          <label className="label">Teléfono
            <Input name="telefono" type="tel" autoComplete="tel" placeholder="221 555-1234" />
          </label>
          <label className="label">Email de contacto
            <Input name="email_contacto" type="email" autoComplete="email" placeholder="contacto@club.com" />
          </label>
          <label className="label" style={{ gridColumn: '1 / -1' }}>Descripción para los jugadores
            <Input name="descripcion" placeholder="Estacionamiento, buffet, duchas, canchas techadas…" />
          </label>
          <label className="label" style={{ gridColumn: '1 / -1' }}>Amenidades (separadas por coma, opcional)
            <Input name="amenidades" placeholder="buffet, estacionamiento, duchas" />
          </label>
        </div>

        <fieldset className="stack" style={{ gap: '0.35rem', border: 'none', padding: 0, margin: 0 }}>
          <legend className="label" style={{ padding: 0 }}>Servicios</legend>
          <label className="fila" style={{ gap: '0.4rem', fontWeight: 400, fontSize: '0.92rem', cursor: 'pointer' }}>
            <input type="checkbox" name="gym" /> Gimnasio mensual
          </label>
          <label className="fila" style={{ gap: '0.4rem', fontWeight: 400, fontSize: '0.92rem', cursor: 'pointer' }}>
            <input type="checkbox" name="pileta" /> Pileta mensual
          </label>
          <label className="fila" style={{ gap: '0.4rem', fontWeight: 400, fontSize: '0.92rem', cursor: 'pointer' }}>
            <input type="checkbox" name="ofrece_socios" /> Plan de socios con descuentos
          </label>
        </fieldset>

        {error && <div className="alerta-error" role="alert" style={{ margin: 0 }}>{error}</div>}

        <button type="submit" className="boton boton-primario boton-block" disabled={cargando}>
          {cargando ? (
            <><Loader2 size={17} className="spin" /> Registrando…</>
          ) : (
            <>Crear mi complejo y empezar <ArrowRight size={17} /></>
          )}
        </button>
        <p className="texto-debil" style={{ fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>
          Al crear el complejo aceptás que PlayControl muestre públicamente su nombre,
          ciudad, canchas, precios y amenidades. Tu suscripción arranca con 14 días de prueba.
        </p>
      </form>
    </main>
  );
}
