import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
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
  const [socios, setSocios] = useState<Socio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', telefono: '' });

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
    setMensaje(null);
    try {
      await api('/socios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevo.nombre,
          apellido: nuevo.apellido,
          telefono: nuevo.telefono,
        }),
      });
      setMensaje('Socio dado de alta ✅');
      setNuevo({ nombre: '', apellido: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de alta');
    }
  }

  async function darDeBaja(id: string) {
    if (!confirm('¿Dar de baja este socio?')) return;
    try {
      await api(`/socios/${id}`, { method: 'DELETE' });
      setMensaje('Socio dado de baja ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja');
    }
  }

  return (
    <main className="pantalla">
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo"><span className="fila"><Users size={20} /> Socios</span></h1>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {mensaje && <p style={{ color: '#10b981' }}>{mensaje}</p>}

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
                <button type="button" onClick={() => void darDeBaja(s.id)} className="boton boton-ghost" style={{ color: '#dc2626' }}>
                  Baja
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
