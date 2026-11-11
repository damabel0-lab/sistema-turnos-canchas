import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { Plus, RefreshCw } from 'lucide-react';

interface SetupResponse {
  setup_completado: boolean;
  config_id: number | null;
  valores: {
    metadatos?: {
      nombre?: string;
      tipo?: string;
      hora_apertura?: number;
      hora_cierre?: number;
    };
    politicas?: {
      cancelacion_minima_horas?: number;
      descuento_turno_fijo_porcentaje?: number;
    };
    amenidades?: {
      gym?: boolean;
      pileta?: boolean;
    };
    socios?: {
      ofrece_socios?: boolean;
    };
  };
}

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

interface Cancha {
  id: number;
  nombre: string;
  deporte_id: number | null;
  precio_base: number;
  activa: boolean;
  caracteristicas: string | null;
  deportes?: { nombre: string; tipo: string } | null;
}

export function ConfiguracionPage() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Metadatos y políticas
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('fraccionado');
  const [horaApertura, setHoraApertura] = useState('08');
  const [horaCierre, setHoraCierre] = useState('23');
  const [cancelacionHoras, setCancelacionHoras] = useState('2');
  const [descuentoTurnoFijo, setDescuentoTurnoFijo] = useState('10');
  const [gym, setGym] = useState(false);
  const [pileta, setPileta] = useState(false);
  const [socios, setSocios] = useState(false);

  // Deportes y canchas
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [nuevoDeporte, setNuevoDeporte] = useState({ nombre: '', tipo: 'cancha', requiere_cancha: true });
  const [nuevaCancha, setNuevaCancha] = useState({
    nombre: '',
    deporte_id: '',
    precio_base: '',
    caracteristicas: '',
    activa: true,
  });

  // Cargar configuración del complejo
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api<SetupResponse>('/admin/setup');
      const meta = data.valores?.metadatos ?? {};
      const pol = data.valores?.politicas ?? {};
      const am = data.valores?.amenidades ?? {};
      const soc = data.valores?.socios ?? {};

      setNombre(meta.nombre ?? '');
      setTipo(meta.tipo ?? 'fraccionado');
      const toTime = (h: number | undefined) => (h !== undefined ? `${String(h).padStart(2, '0')}:00` : '08:00');
      setHoraApertura(toTime(meta.hora_apertura));
      setHoraCierre(toTime(meta.hora_cierre));
      setCancelacionHoras(String(pol.cancelacion_minima_horas ?? '2'));
      setDescuentoTurnoFijo(String(pol.descuento_turno_fijo_porcentaje ?? '10'));
      setGym(am.gym ?? false);
      setPileta(am.pileta ?? false);
      setSocios(soc.ofrece_socios ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar deportes y canchas
  const cargarCatalogo = useCallback(async () => {
    try {
      const [dep, can] = await Promise.all([
        api<Deporte[]>('/deportes'),
        api<Cancha[]>('/canchas'),
      ]);
      setDeportes(dep);
      setCanchas(can);
    } catch (e) {
      console.warn('Error cargando catálogo:', e);
    }
  }, []);

  useEffect(() => {
    void cargar();
    void cargarCatalogo();
  }, [cargar, cargarCatalogo]);

  async function guardar(parcial?: Record<string, Record<string, unknown>>) {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const payload = parcial ?? {
        metadatos: {
          nombre,
          tipo,
          hora_apertura: Number(horaApertura.split(':')[0] || '0'),
          hora_cierre: Number(horaCierre.split(':')[0] || '0'),
        },
        politicas: {
          cancelacion_minima_horas: Number(cancelacionHoras),
          descuento_turno_fijo_porcentaje: Number(descuentoTurnoFijo),
        },
        amenidades: {
          gym,
          pileta,
        },
        socios: {
          ofrece_socios: socios,
        },
      };

      await api('/admin/setup', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setMensaje('Configuración guardada ✅');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function agregarDeporte(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await api('/deportes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevoDeporte.nombre,
          tipo: nuevoDeporte.tipo,
          requiere_cancha: nuevoDeporte.requiere_cancha,
        }),
      });
      setNuevoDeporte({ nombre: '', tipo: 'cancha', requiere_cancha: true });
      await cargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el deporte');
    }
  }

  async function agregarCancha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nuevaCancha.deporte_id) {
      setError('Elige un deporte');
      return;
    }
    try {
      await api('/canchas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevaCancha.nombre,
          deporte_id: Number(nuevaCancha.deporte_id),
          precio_base: Number(nuevaCancha.precio_base),
          activa: nuevaCancha.activa,
          caracteristicas: nuevaCancha.caracteristicas || null,
        }),
      });
      setNuevaCancha({ nombre: '', deporte_id: '', precio_base: '', caracteristicas: '', activa: true });
      await cargarCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cancha');
    }
  }

  if (cargando) {
    return (
      <main className="pantalla">
        <div className="contenedor">
          <Card><p className="texto-sec">Cargando configuración…</p></Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <div className="contenedor">
        <h1 className="titulo">Configuración del complejo</h1>
        <p className="texto-sec">Acá podés revisar y editar todo lo que configuraste al inicio.</p>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {mensaje && <p style={{ color: '#10b981' }}>{mensaje}</p>}

        {/* Datos del complejo */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Datos del complejo</h3>
          <label className="label">
            Nombre comercial
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" />
          </label>
          <label className="label">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
              <option value="fraccionado">Cancha individual / Fraccionado</option>
              <option value="complejo_deportivo">Complejo deportivo</option>
            </select>
          </label>
          <label className="label">
            Horario de apertura
            <input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} className="input" />
          </label>
          <label className="label">
            Horario de cierre
            <input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} className="input" />
          </label>
        </Card>

        {/* Políticas */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Políticas</h3>
          <label className="label">
            Horas mínimas para cancelar antes del turno
            <input
              type="number"
              min={0}
              max={48}
              value={cancelacionHoras}
              onChange={(e) => setCancelacionHoras(e.target.value)}
              className="input"
            />
          </label>
          <label className="label">
            Descuento para clientes con turno fijo (%)
            <input
              type="number"
              min={0}
              max={100}
              value={descuentoTurnoFijo}
              onChange={(e) => setDescuentoTurnoFijo(e.target.value)}
              className="input"
            />
          </label>
        </Card>

        {/* Amenidades */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Amenidades</h3>
          <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={gym} onChange={(e) => setGym(e.target.checked)} />
            Gimnasio activo
          </label>
          <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={pileta} onChange={(e) => setPileta(e.target.checked)} />
            Pileta activa
          </label>
        </Card>

        {/* Socios */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Socios</h3>
          <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={socios} onChange={(e) => setSocios(e.target.checked)} />
            Ofrecer socios con descuentos
          </label>
        </Card>

        {/* Deportes */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Deportes</h3>
          <form onSubmit={agregarDeporte} className="fila" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              value={nuevoDeporte.nombre}
              onChange={(e) => setNuevoDeporte({ ...nuevoDeporte, nombre: e.target.value })}
              placeholder="Nombre del deporte"
              required
              className="input" style={{ flex: 1 }}
            />
            <select
              value={nuevoDeporte.tipo}
              onChange={(e) => setNuevoDeporte({ ...nuevoDeporte, tipo: e.target.value })}
              className="input"
            >
              <option value="cancha">Cancha</option>
              <option value="gimnasio">Gimnasio</option>
              <option value="pileta">Pileta</option>
              <option value="otro">Otro</option>
            </select>
            <button type="submit" className="boton boton-primario"><Plus size={16} /> Agregar</button>
          </form>
          {deportes.length === 0 ? (
            <p className="texto-sec">Aún no hay deportes cargados.</p>
          ) : (
            <div className="stack" style={{ listStyle: 'none', padding: 0 }}>
              {deportes.map((d) => (
                <div key={d.id} className="fila-entre">
                  <div>
                    <span style={{ fontWeight: 600 }}>{d.nombre}</span>
                    <span className="texto-sec" style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                      {d.tipo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Canchas */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Canchas</h3>
          <form onSubmit={agregarCancha} className="stack">
            <label className="label">
              Nombre
              <input
                value={nuevaCancha.nombre}
                onChange={(e) => setNuevaCancha({ ...nuevaCancha, nombre: e.target.value })}
                required
                className="input"
              />
            </label>
            <label className="label">
              Deporte
              <select
                value={nuevaCancha.deporte_id}
                onChange={(e) => setNuevaCancha({ ...nuevaCancha, deporte_id: e.target.value })}
                required
                className="input"
              >
                <option value="">Elegir…</option>
                {deportes.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Precio por hora ($)
              <input
                type="number"
                min={0}
                value={nuevaCancha.precio_base}
                onChange={(e) => setNuevaCancha({ ...nuevaCancha, precio_base: e.target.value })}
                required
                className="input"
              />
            </label>
            <label className="label">
              Características
              <input
                value={nuevaCancha.caracteristicas}
                placeholder="Ej: Iluminada, techada…"
                onChange={(e) => setNuevaCancha({ ...nuevaCancha, caracteristicas: e.target.value })}
                className="input"
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario"><Plus size={16} /> Agregar cancha</button>
            </div>
          </form>

          {canchas.length === 0 ? (
            <p className="texto-sec" style={{ marginTop: '0.75rem' }}>Aún no hay canchas cargadas.</p>
          ) : (
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              {canchas.map((c) => (
                <div key={c.id} className="tarjeta-plana" style={{ padding: '0.5rem 0.75rem' }}>
                  <div className="fila-entre">
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      <div className="texto-sec" style={{ fontSize: '0.85rem' }}>
                        {c.deportes?.nombre ?? 'Sin deporte'} · ${c.precio_base}/h
                      </div>
                    </div>
                    <Badge variant={c.activa ? 'success' : 'neutral'}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Botones guardar */}
        <div className="fila" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="boton boton-secondary" onClick={() => void cargar()}>
            <RefreshCw size={16} /> Recargar
          </button>
          <button className="boton boton-primario" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </main>
  );
}
