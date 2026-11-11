import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Users, RefreshCw } from 'lucide-react';

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
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo"><span className="fila"><Users size={20} /> Beneficios de socios</span></h1>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
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

        {error && <div className="alerta-error" role="alert">{error}</div>}

        <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Catálogo de beneficios</h2>
        <Card>
          <form onSubmit={crear} className="stack">
            <label className="label">Nombre del beneficio
              <input required value={nuevo.nombre_beneficio} onChange={(e) => setNuevo({ ...nuevo, nombre_beneficio: e.target.value })} className="input" />
            </label>
            <label className="label">Descuento (%)
              <input required type="number" min={0} max={100} step={1} value={nuevo.descuento_porcentaje} onChange={(e) => setNuevo({ ...nuevo, descuento_porcentaje: e.target.value })} className="input" />
            </label>
            <label className="label">Aplica en
              <select value={nuevo.aplica_en} onChange={(e) => setNuevo({ ...nuevo, aplica_en: e.target.value })} className="input">
                <option value="cancha">Cancha</option>
                <option value="gimnasio">Gimnasio</option>
                <option value="pileta">Pileta</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario">Crear beneficio</button>
            </div>
          </form>
        </Card>

        <h2 className="titulo" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Beneficios activos</h2>
        {beneficios.length === 0 ? (
          <Card className="caja-vacia"><p className="texto-sec">No hay beneficios todavía.</p></Card>
        ) : (
          <div className="stack">
            {beneficios.map((b) => (
              <Card key={b.id} className="fila-entre">
                <div>
                  <div style={{ fontWeight: 600 }}>{b.nombre_beneficio}</div>
                  <div className="texto-sec" style={{ fontSize: '0.85rem' }}>
                    {b.descuento_porcentaje}% de descuento en {b.aplica_en}
                  </div>
                </div>
                <button type="button" onClick={() => setBorrarBeneficio(b)} className="boton boton-ghost" style={{ color: 'var(--peligro)' }}>
                  Borrar
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
