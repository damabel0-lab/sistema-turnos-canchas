import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Users, RefreshCw } from 'lucide-react';

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

  return (
    <div className="admin-page">
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo"><span className="fila"><Users size={20} /> Socios</span></h1>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
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

        {error && <div className="alerta-error" role="alert">{error}</div>}

        <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Dar de alta socio</h2>
        <Card>
          <form onSubmit={darDeAlta} className="stack">
            <label className="label">Nombre<input required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className="input" /></label>
            <label className="label">Apellido<input required value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} className="input" /></label>
            <label className="label">Teléfono<input required value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className="input" /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario">Dar de alta</button>
            </div>
          </form>
        </Card>

        <h2 className="titulo" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Directorio de socios</h2>
        {socios.length === 0 ? (
          <Card className="caja-vacia"><p className="texto-sec">No hay socios todavía.</p></Card>
        ) : (
          <div className="stack">
            {socios.map((s) => (
              <Card key={s.id} className="fila-entre">
                <div className="fila" style={{ gap: '0.75rem' }}>
                  <div className="icono-circulo" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nombre} {s.apellido}</div>
                    <div className="texto-sec" style={{ fontSize: '0.85rem' }}>{s.telefono ?? '—'}</div>
                  </div>
                </div>
                <button type="button" onClick={() => setBajaSocio(s)} className="boton boton-ghost" style={{ color: 'var(--peligro)' }}>
                  Baja
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
