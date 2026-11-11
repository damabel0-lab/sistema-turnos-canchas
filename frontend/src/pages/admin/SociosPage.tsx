import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Users, RefreshCw, Plus, Search } from 'lucide-react';

interface Socio {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  es_socio: boolean;
  creado_en: string;
}

export function SociosPage() {
  const { toasts, mostrar, cerrar } = useToast();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', telefono: '' });
  const [bajaSocio, setBajaSocio] = useState<Socio | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    try {
      setSocios(await api<Socio[]>('/socios'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando socios');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function darDeAlta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await api('/socios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevo.nombre,
          apellido: nuevo.apellido,
          telefono: nuevo.telefono,
        }),
      });
      mostrar(`Socio ${nuevo.nombre} ${nuevo.apellido} dado de alta.`, 'success');
      setNuevo({ nombre: '', apellido: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de alta');
    }
  }

  async function darDeBaja() {
    const socio = bajaSocio;
    if (!socio) return;
    try {
      await api(`/socios/${socio.id}`, { method: 'DELETE' });
      setBajaSocio(null);
      mostrar(`${socio.nombre} ${socio.apellido} dado de baja.`, 'success');
      await cargar();
    } catch (err) {
      setBajaSocio(null);
      mostrar(err instanceof Error ? err.message : 'No se pudo dar de baja', 'danger');
    }
  }

  const filtrados = socios.filter((s) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return `${s.nombre} ${s.apellido} ${s.telefono ?? ''}`.toLowerCase().includes(q);
  });

  const iniciales = (s: Socio) => `${(s.nombre[0] ?? '').toUpperCase()}${(s.apellido[0] ?? '').toUpperCase()}`;

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />
      <ConfirmDialog
        open={!!bajaSocio}
        titulo="Dar de baja socio"
        descripcion={
          bajaSocio
            ? `${bajaSocio.nombre} ${bajaSocio.apellido} (${bajaSocio.telefono ?? 'sin teléfono'}) perderá los beneficios de socio. ¿Confirmás?`
            : undefined
        }
        confirmarTexto="Dar de baja"
        onConfirmar={() => void darDeBaja()}
        onCancelar={() => setBajaSocio(null)}
        peligro
      />

      {/* Encabezado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Operación › Socios</span>
          <h1 className="pagina-titulo">Socios y membresías</h1>
          <p className="pagina-sub">Directorio de socios del complejo. Alta simple desde acá.</p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      <div className="grilla-2-col" style={{ gap: '0.9rem' }}>
        {/* ===== Alta de socio ===== */}
        <aside className="panel panel-con-altura">
          <div className="panel-header"><span className="panel-titulo">Dar de alta socio</span></div>
          <div className="panel-body">
            <form onSubmit={darDeAlta} className="stack">
              <label className="label">Nombre<input required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className="input" placeholder="Nahuel" /></label>
              <label className="label">Apellido<input required value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} className="input" placeholder="Gauna" /></label>
              <label className="label">Teléfono<input required value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className="input" placeholder="+54 9 11 0000-0000" /></label>
              <button type="submit" className="boton boton-primario boton-block"><Plus size={15} /> Dar de alta</button>
            </form>
          </div>
        </aside>

        {/* ===== Directorio ===== */}
        <section className="panel panel-con-altura" aria-labelledby="directorio-titulo">
          <div className="panel-header">
            <span className="panel-titulo" id="directorio-titulo">Directorio</span>
            <span className="texto-debil">{filtrados.length} socio{filtrados.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="panel-body" style={{ paddingBottom: '0.5rem' }}>
            <label className="fila" style={{ gap: '0.35rem', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radio)', padding: '0.35rem 0.6rem' }}>
              <Search size={14} style={{ color: 'var(--texto-3)' }} />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o teléfono…"
                className="input"
                style={{ border: 'none', background: 'transparent', padding: '0.2rem', outline: 'none' }}
                aria-label="Buscar socio"
              />
            </label>

            {filtrados.length === 0 ? (
              <div className="panel-vacio" style={{ marginTop: '0.5rem' }}>
                <Users size={22} style={{ color: 'var(--primario-2)' }} />
                <p style={{ margin: 0 }}>{busqueda.trim() ? 'Ningún socio coincide.' : 'Todavía no hay socios.'}</p>
                <p className="texto-debil" style={{ margin: 0 }}>{busqueda.trim() ? 'Probá con otro nombre o teléfono.' : 'Dá de alta el primero desde la izquierda.'}</p>
              </div>
            ) : (
              filtrados.map((s) => (
                <div key={s.id} className="item-turno">
                  <div className="icono-circulo" style={{ width: '2.2rem', height: '2.2rem', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>
                    {iniciales(s) || '—'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="item-turno-nombre">{s.nombre} {s.apellido}</div>
                    <div className="item-turno-meta">{s.telefono ?? 'Sin teléfono'} · Socio desde {new Date(s.creado_en).toLocaleDateString('es-AR')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBajaSocio(s)}
                    className="boton boton-ghost"
                    style={{ color: 'var(--peligro)', padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
                  >
                    Baja
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
