import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BadgePercent, Trash2, RefreshCw, Plus } from 'lucide-react';

interface Beneficio {
  id: number;
  nombre_beneficio: string;
  descuento_porcentaje: number;
  aplica_en: string;
}

export function BeneficiosPage() {
  const { toasts, mostrar, cerrar } = useToast();
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({
    nombre_beneficio: '',
    descuento_porcentaje: '',
    aplica_en: 'cancha',
  });
  const [borrarBeneficio, setBorrarBeneficio] = useState<Beneficio | null>(null);

  const cargar = useCallback(async () => {
    try {
      setBeneficios(await api<Beneficio[]>('/beneficios'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando beneficios');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await api('/beneficios', {
        method: 'POST',
        body: JSON.stringify({
          nombre_beneficio: nuevo.nombre_beneficio,
          descuento_porcentaje: Number(nuevo.descuento_porcentaje),
          aplica_en: nuevo.aplica_en,
        }),
      });
      mostrar(`Beneficio "${nuevo.nombre_beneficio}" creado.`, 'success');
      setNuevo({ nombre_beneficio: '', descuento_porcentaje: '', aplica_en: 'cancha' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  async function borrar() {
    const beneficio = borrarBeneficio;
    if (!beneficio) return;
    try {
      await api(`/beneficios/${beneficio.id}`, { method: 'DELETE' });
      setBorrarBeneficio(null);
      mostrar(`Beneficio "${beneficio.nombre_beneficio}" eliminado.`, 'success');
      await cargar();
    } catch (err) {
      setBorrarBeneficio(null);
      mostrar(err instanceof Error ? err.message : 'No se pudo eliminar', 'danger');
    }
  }

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />
      <ConfirmDialog
        open={!!borrarBeneficio}
        titulo="Eliminar beneficio"
        descripcion={
          borrarBeneficio
            ? `"${borrarBeneficio.nombre_beneficio}" (${borrarBeneficio.descuento_porcentaje}% en ${borrarBeneficio.aplica_en}) se eliminará para todos los socios. ¿Confirmás?`
            : undefined
        }
        confirmarTexto="Eliminar"
        onConfirmar={() => void borrar()}
        onCancelar={() => setBorrarBeneficio(null)}
        peligro
      />

      {/* Encabezado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Operación › Socios</span>
          <h1 className="pagina-titulo">Beneficios de socios</h1>
          <p className="pagina-sub">Descuentos que se aplican automáticamente al reservar para clientes con membresía.</p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      <div className="grilla-2-col" style={{ gap: '0.9rem' }}>
        {/* ===== Formulario de creación ===== */}
        <aside className="panel" style={{ alignSelf: 'start' }}>
          <div className="panel-header"><span className="panel-titulo">Nuevo beneficio</span></div>
          <div className="panel-body">
            <form onSubmit={crear} className="stack">
              <label className="label">Nombre del beneficio
                <input required value={nuevo.nombre_beneficio} onChange={(e) => setNuevo({ ...nuevo, nombre_beneficio: e.target.value })} className="input" placeholder="Ej: 10% off Socios" />
              </label>
              <label className="label">Descuento (%)
                <input required type="number" min={0} max={100} step={1} value={nuevo.descuento_porcentaje} onChange={(e) => setNuevo({ ...nuevo, descuento_porcentaje: e.target.value })} className="input" placeholder="10" />
              </label>
              <label className="label">Aplica en
                <select value={nuevo.aplica_en} onChange={(e) => setNuevo({ ...nuevo, aplica_en: e.target.value })} className="input">
                  <option value="cancha">Cancha</option>
                  <option value="gimnasio">Gimnasio</option>
                  <option value="pileta">Pileta</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <button type="submit" className="boton boton-primario boton-block"><Plus size={15} /> Crear beneficio</button>
            </form>
          </div>
        </aside>

        {/* ===== Activos ===== */}
        <section className="panel" aria-labelledby="activos-titulo">
          <div className="panel-header">
            <span className="panel-titulo" id="activos-titulo">Beneficios activos</span>
            <span className="texto-debil">{beneficios.length} total</span>
          </div>
          <div className="panel-body">
            {beneficios.length === 0 ? (
              <div className="panel-vacio">
                <BadgePercent size={22} style={{ color: 'var(--primario-2)' }} />
                <p style={{ margin: 0 }}>Todavía no creaste beneficios.</p>
                <p className="texto-debil" style={{ margin: 0 }}>Creá el primero.</p>
              </div>
            ) : (
              beneficios.map((b) => (
                <div key={b.id} className="item-turno">
                  <div className="item-turno-icono"><BadgePercent size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="item-turno-nombre">{b.nombre_beneficio}</div>
                    <div className="item-turno-meta">
                      <strong style={{ color: 'var(--primario-2)' }}>{b.descuento_porcentaje}%</strong>
                      {' '}de descuento en {b.aplica_en}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBorrarBeneficio(b)}
                    className="boton boton-ghost"
                    style={{ color: 'var(--peligro)', padding: '0.35rem 0.6rem' }}
                    aria-label={`Eliminar beneficio ${b.nombre_beneficio}`}
                  >
                    <Trash2 size={14} />
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
