import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui';
import {
  Goal,
  Plus,
  MapPin,
  RefreshCw,
  CalendarClock,
  HandCoins,
  BadgeCheck,
  Phone,
  Repeat,
  Lock,
  X,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ItemGrilla {
  hora: string;
  tipo: 'reserva' | 'bloqueo';
  estado?: string;
  reserva_id?: number;
  cliente?: string;
  monto?: number;
  motivo?: string;
}

interface FilaGrilla {
  cancha_id: number;
  cancha: string;
  deporte: string | null;
  items: ItemGrilla[];
}

interface ConfigComplejo {
  hora_apertura: number;
  hora_cierre: number;
  cancelacion_minima_horas: number;
  descuento_turno_fijo_porcentaje: number;
}

const hoy = () => new Date().toISOString().slice(0, 10);

const estadosReserva: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pendiente_seña: 'warning',
  confirmada: 'success',
  completada: 'neutral',
  cancelada: 'danger',
};

export function GrillaPage() {
  const [fecha, setFecha] = useState(hoy());
  const [filas, setFilas] = useState<FilaGrilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toasts, mostrar, cerrar } = useToast();

  const [carga, setCarga] = useState({ nombre: '', telefono: '', cancha_id: '', hora: '10:15' });
  const [sel, setSel] = useState<{ reserva_id: number; cliente?: string; estado?: string; monto?: number } | null>(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [bloqueo, setBloqueo] = useState({ cancha_id: '', desde: '08:00', hasta: '09:00', motivo: '' });
  const [turnoFijo, setTurnoFijo] = useState({ nombre: '', telefono: '', cancha_id: '', dia_semana: '', hora: '', semanas: '4' });
  const [config, setConfig] = useState<ConfigComplejo | null>(null);

  useEffect(() => {
    api<ConfigComplejo>('/config').then(setConfig).catch((e) => setError(e.message));
  }, []);

  // Turnos válidos (:15 a :15, 1 hora) — coincide con la disponibilidad del backend
  // Si el cierre es <= apertura, se interpreta del día siguiente (complejo de noche)
  const HORAS_TURNO = config
    ? (() => {
        const ajusteCierre = config.hora_cierre <= config.hora_apertura
          ? (config.hora_cierre === 0 ? 24 * 60 : (config.hora_cierre + 24) * 60)
          : config.hora_cierre * 60;
        const slots: string[] = [];
        for (let min = config.hora_apertura * 60 + 15; min + 60 <= ajusteCierre; min += 60) {
          const m = ((min % 1440) + 1440) % 1440;
          slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
        }
        return slots;
      })()
    : [];

  // Carril horizontal de canchas por deporte
  const carrilesRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [nudges, setNudges] = useState<Record<string, { izq: boolean; der: boolean }>>({});

  const grupos = useMemo(() => {
    const map = new Map<string, FilaGrilla[]>();
    for (const f of filas) {
      const key = f.deporte ?? 'Otro';
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [filas]);

  function mover(id: string, dir: 1 | -1) {
    const el = carrilesRefs.current[id];
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.cal-card');
    const paso = (card?.offsetWidth ?? 360) + 12;
    el.scrollBy({ left: dir * paso, behavior: 'smooth' });
  }

  function onScrollLane(id: string) {
    const el = carrilesRefs.current[id];
    if (!el) return;
    setNudges((prev) => ({
      ...prev,
      [id]: { izq: el.scrollLeft <= 4, der: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 },
    }));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      const next: Record<string, { izq: boolean; der: boolean }> = {};
      for (const [id, el] of Object.entries(carrilesRefs.current)) {
        if (!el) continue;
        next[id] = { izq: el.scrollLeft <= 4, der: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 };
      }
      setNudges(next);
    }, 80);
    return () => clearTimeout(t);
  }, [grupos]);

  const DIAS_SEMANA = [
    { valor: 0, texto: 'Domingo' },
    { valor: 1, texto: 'Lunes' },
    { valor: 2, texto: 'Martes' },
    { valor: 3, texto: 'Miércoles' },
    { valor: 4, texto: 'Jueves' },
    { valor: 5, texto: 'Viernes' },
    { valor: 6, texto: 'Sábado' },
  ];

  const cargar = useCallback(async () => {
    try {
      setFilas(await api<FilaGrilla[]>(`/reservas/grilla?fecha=${fecha}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando la grilla');
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiarEstado(estado: 'confirmada' | 'completada' | 'cancelada') {
    if (!sel) return;
    setError(null);
    try {
      await api(`/reservas/${sel.reserva_id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, metodo_pago: estado === 'confirmada' ? metodo : undefined }),
      });
      const textos: Record<string, string> = {
        confirmada: 'Cobro registrado y reserva confirmada',
        completada: 'Reserva marcada como completada',
        cancelada: 'Reserva cancelada',
      };
      mostrar(`${textos[estado]} (#${sel.reserva_id})`, 'success');
      setSel(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  async function guardarManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      const [h, m] = carga.hora.split(':').map(Number);
      const totalFin = h * 60 + m + 60;
      const fin = `${String(Math.floor(totalFin / 60)).padStart(2, '0')}:${String(totalFin % 60).padStart(2, '0')}`;
      const r = await api<{ id: number }>('/reservas/manual', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: carga.nombre,
          cliente_telefono: carga.telefono,
          cancha_id: Number(carga.cancha_id),
          fecha,
          hora_inicio: carga.hora,
          hora_fin: fin,
        }),
      });
      mostrar(`Turno #${r.id} anotado para ${carga.nombre}`, 'success');
      setCarga({ ...carga, nombre: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anotar el turno');
    }
  }

  async function guardarBloqueo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await api('/bloqueos', {
        method: 'POST',
        body: JSON.stringify({
          cancha_id: Number(bloqueo.cancha_id),
          fecha_inicio: `${fecha}T${bloqueo.desde}:00`,
          fecha_fin: `${fecha}T${bloqueo.hasta}:00`,
          motivo: bloqueo.motivo,
        }),
      });
      mostrar('Horario bloqueado', 'success');
      setBloqueo({ ...bloqueo, motivo: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo bloquear');
    }
  }

  async function guardarTurnoFijo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      const semanasValidas = Math.min(Math.max(Number(turnoFijo.semanas), 1), 52);
      const r = await api<{ total_creadas: number; total_solicitadas: number }>('/reservas/turno-fijo', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: turnoFijo.nombre,
          cliente_telefono: turnoFijo.telefono,
          cancha_id: Number(turnoFijo.cancha_id),
          dia_semana: Number(turnoFijo.dia_semana),
          hora: turnoFijo.hora,
          semanas: semanasValidas,
          estado: 'pendiente_seña',
        }),
      });
      mostrar(`Turnos fijos creados: ${r.total_creadas} de ${r.total_solicitadas}`, 'success');
      setTurnoFijo({ ...turnoFijo, nombre: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el turno fijo');
    }
  }

  const totalReservas = filas.reduce((n, f) => n + f.items.filter((i) => i.tipo === 'reserva').length, 0);
  const porCobrar = filas.reduce(
    (n, f) =>
      n +
      f.items
        .filter((i) => i.tipo === 'reserva' && i.estado === 'pendiente_seña')
        .reduce((s, i) => s + (i.monto ?? 0), 0),
    0
  );
  const cobrado = filas.reduce(
    (n, f) =>
      n +
      f.items
        .filter((i) => i.tipo === 'reserva' && i.estado === 'confirmada')
        .reduce((s, i) => s + (i.monto ?? 0), 0),
    0
  );
  const precio = (n: number) => `$${n.toLocaleString('es-AR')}`;

  /** Tarjeta de cancha con su mini-grilla de horarios (se reutiliza en cada grupo) */
  const renderTarjetaCancha = (f: FilaGrilla) => {
    const reservasCount = f.items.filter((i) => i.tipo === 'reserva').length;
    const ocupacion = Math.round((reservasCount / Math.max(HORAS_TURNO.length, 1)) * 100);
    const libre = Math.max(HORAS_TURNO.length - reservasCount, 0);
    return (
      <section key={f.cancha_id} className="cal-card" aria-label={`Cancha ${f.cancha}`}>
        <div className="cal-card-head">
          <div className="fila" style={{ gap: '0.5rem', minWidth: 0 }}>
            <span className="cal-cancha-icono">
              <Goal size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="cal-cancha-nombre">{f.cancha}</div>
              <div className="cal-cancha-deporte">{f.deporte ?? '—'}</div>
            </div>
          </div>
          <div className="cal-card-resumen">
            <span className="cal-chip-count">{reservasCount} turno{reservasCount !== 1 ? 's' : ''}</span>
            {libre > 0 && <span className="cal-chip-libre">{libre} libre{libre !== 1 ? 's' : ''}</span>}
          </div>
        </div>

        <div className="cal-ocup-track" role="progressbar" aria-valuenow={ocupacion} aria-valuemin={0} aria-valuemax={100} title={`${ocupacion}% de ocupación`}>
          <div className="cal-ocup-fill" style={{ width: `${ocupacion}%` }} />
        </div>

        <div className="cal-slots">
          {HORAS_TURNO.map((h) => {
            const item = f.items.find((i) => i.hora === h);
            if (!item) {
              return (
                <div key={h} className="cal-slot libre" title={`${h} · Libre`}>
                  <span className="cal-slot-hora">{h}</span>
                </div>
              );
            }
            if (item.tipo === 'bloqueo') {
              return (
                <div key={h} className="cal-slot bloqueo" title={`${h} · Bloqueada${item.motivo ? `: ${item.motivo}` : ''}`}>
                  <Lock size={10} />
                  <span className="cal-slot-hora">{h}</span>
                </div>
              );
            }
            const estado = item.estado ?? 'pendiente_seña';
            return (
              <button
                key={h}
                type="button"
                className={`cal-slot ${estado}`}
                disabled={!item.reserva_id}
                onClick={() => {
                  if (item.reserva_id) {
                    setSel({ reserva_id: item.reserva_id, cliente: item.cliente, estado: item.estado, monto: item.monto });
                  }
                }}
                title={`${h} · ${item.cliente ?? 'Reserva'} · ${estado} · ${precio(item.monto ?? 0)}`}
              >
                <span className="cal-slot-hora">{h}</span>
                <span className="cal-slot-cliente">{item.cliente ?? 'Reserva'}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />

      {/* ===== Encabezado compacto ===== */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">PlayControl · Grilla</span>
          <h1 className="pagina-titulo">Grilla del día</h1>
          <p className="pagina-sub">Agenda y controles en tiempo real · turnos de 1 h (:15 a :15)</p>
        </div>
        <div className="fila" style={{ gap: '0.5rem' }}>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
            aria-label="Fecha de la grilla"
          />
          <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="alerta-error" role="alert">
          {error}
        </div>
      )}

      {/* ===== Stat strip ===== */}
      <div className="grilla-stats-3">
        <div className="metrica">
          <div className="metrica-icono verde"><CalendarClock size={19} /></div>
          <div className="metrica-label">Turnos de hoy</div>
          <div className="metrica-valor">{totalReservas}</div>
        </div>
        <div className="metrica">
          <div className="metrica-icono ambar"><HandCoins size={19} /></div>
          <div className="metrica-label">Pendiente de cobro</div>
          <div className="metrica-valor">{precio(porCobrar)}</div>
        </div>
        <div className="metrica">
          <div className="metrica-icono verde"><BadgeCheck size={19} /></div>
          <div className="metrica-label">Cobrado hoy</div>
          <div className="metrica-valor">{precio(cobrado)}</div>
        </div>
      </div>

      {/* ===== Agenda del día (agrupada por deporte · carrusel) ===== */}
      <div className="agenda-head">
        <span className="panel-titulo">Agenda del día</span>
        <div className="leyenda-grilla" aria-label="Leyenda de la grilla">
          <span className="leyenda-chip"><span className="leyenda-punto pendiente" /> Pendiente</span>
          <span className="leyenda-chip"><span className="leyenda-punto confirmada" /> Confirmada</span>
          <span className="leyenda-chip"><span className="leyenda-punto completada" /> Completada</span>
          <span className="leyenda-chip"><span className="leyenda-punto bloqueo" /> Bloqueo</span>
        </div>
      </div>
      {grupos.length === 0 ? (
        <div className="panel" style={{ marginBottom: '0.9rem' }}>
          <div className="panel-vacio">No hay canchas para mostrar.</div>
        </div>
      ) : (
        grupos.map(([deporte, canchas]) => {
          const n = nudges[deporte] ?? { izq: true, der: true };
          const mostrarFlechas = canchas.length > 3;
          return (
            <section key={deporte} className="panel" style={{ marginBottom: '0.9rem' }}>
              <div className="panel-header">
                <span className="panel-titulo">
                  <Trophy size={12} style={{ verticalAlign: '-0.15em', marginRight: '0.35rem' }} />
                  {deporte}
                  <small className="texto-debil" style={{ marginLeft: '0.35rem', textTransform: 'none', letterSpacing: 0, fontWeight: 650 }}>
                    {canchas.length} cancha{canchas.length !== 1 ? 's' : ''}
                  </small>
                </span>
                {mostrarFlechas && (
                  <div className="fila" style={{ gap: '0.35rem' }}>
                    <button type="button" className="flecha-carril" onClick={() => mover(deporte, -1)} disabled={n.izq} aria-label={`Ver canchas anteriores de ${deporte}`}>
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" className="flecha-carril" onClick={() => mover(deporte, 1)} disabled={n.der} aria-label={`Ver canchas siguientes de ${deporte}`}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="canchas-carril" ref={(el) => { carrilesRefs.current[deporte] = el; }} onScroll={() => onScrollLane(deporte)}>
                {canchas.map(renderTarjetaCancha)}
              </div>
            </section>
          );
        })
      )}
      {/* ===== Herramientas (3 columnas) ===== */}
      <div className="grilla-3">
        {/* Carga rápida */}
        <section className="panel" aria-labelledby="carga-titulo">
          <div className="panel-header">
            <span className="panel-titulo" id="carga-titulo"><Phone size={12} style={{ verticalAlign: '-0.1em', marginRight: '0.3rem' }} />Carga rápida (teléfono)</span>
          </div>
          <form onSubmit={guardarManual} className="panel-body">
            <label className="label">Nombre<input required value={carga.nombre} onChange={(e) => setCarga({ ...carga, nombre: e.target.value })} className="input" placeholder="Juan Pérez" /></label>
            <label className="label">Teléfono<input required value={carga.telefono} onChange={(e) => setCarga({ ...carga, telefono: e.target.value })} className="input" placeholder="+54 9 11 0000-0000" /></label>
            <label className="label">Cancha
              <select required value={carga.cancha_id} onChange={(e) => setCarga({ ...carga, cancha_id: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {filas.map((f) => (<option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>))}
              </select>
            </label>
            <label className="label">Hora (1 h)
              <select value={carga.hora} onChange={(e) => setCarga({ ...carga, hora: e.target.value })} className="input">
                {HORAS_TURNO.map((h) => (<option key={h} value={h}>{h}</option>))}
              </select>
            </label>
            <button type="submit" className="boton boton-primario boton-block"><Plus size={15} /> Anotar turno</button>
          </form>
        </section>

        {/* Turno fijo semanal */}
        <section className="panel" aria-labelledby="fijo-titulo">
          <div className="panel-header">
            <span className="panel-titulo" id="fijo-titulo"><Repeat size={12} style={{ verticalAlign: '-0.1em', marginRight: '0.3rem' }} />Turno fijo semanal</span>
          </div>
          <form onSubmit={guardarTurnoFijo} className="panel-body">
            <label className="label">Nombre del cliente<input required value={turnoFijo.nombre} onChange={(e) => setTurnoFijo({ ...turnoFijo, nombre: e.target.value })} className="input" placeholder="Juan Pérez" /></label>
            <label className="label">Teléfono<input required value={turnoFijo.telefono} onChange={(e) => setTurnoFijo({ ...turnoFijo, telefono: e.target.value })} className="input" placeholder="+54 9 11 0000-0000" /></label>
            <div className="grid-2" style={{ gap: '0.5rem' }}>
              <label className="label">Cancha
                <select required value={turnoFijo.cancha_id} onChange={(e) => setTurnoFijo({ ...turnoFijo, cancha_id: e.target.value })} className="input">
                  <option value="">Elegir…</option>
                  {filas.map((f) => (<option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>))}
                </select>
              </label>
              <label className="label">Día
                <select required value={turnoFijo.dia_semana} onChange={(e) => setTurnoFijo({ ...turnoFijo, dia_semana: e.target.value })} className="input">
                  <option value="">Elegir…</option>
                  {DIAS_SEMANA.map((d) => (<option key={d.valor} value={d.valor}>{d.texto}</option>))}
                </select>
              </label>
            </div>
            <div className="grid-2" style={{ gap: '0.5rem' }}>
              <label className="label">Hora
                <select required value={turnoFijo.hora} onChange={(e) => setTurnoFijo({ ...turnoFijo, hora: e.target.value })} className="input">
                  <option value="">Elegir…</option>
                  {HORAS_TURNO.map((h) => (<option key={h} value={h}>{h}</option>))}
                </select>
              </label>
              <label className="label">Semanas
                <input required type="number" min={1} max={52} value={turnoFijo.semanas} onChange={(e) => setTurnoFijo({ ...turnoFijo, semanas: e.target.value })} className="input" />
              </label>
            </div>
            <button type="submit" className="boton boton-primario boton-block"><Repeat size={15} /> Crear turno fijo</button>
          </form>
        </section>

        {/* Bloquear horario */}
        <section className="panel" aria-labelledby="bloqueo-titulo">
          <div className="panel-header">
            <span className="panel-titulo" id="bloqueo-titulo"><MapPin size={12} style={{ verticalAlign: '-0.1em', marginRight: '0.3rem' }} />Bloquear horario</span>
          </div>
          <form onSubmit={guardarBloqueo} className="panel-body">
            <label className="label">Cancha
              <select required value={bloqueo.cancha_id} onChange={(e) => setBloqueo({ ...bloqueo, cancha_id: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {filas.map((f) => (<option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>))}
              </select>
            </label>
            <div className="grid-2" style={{ gap: '0.5rem' }}>
              <label className="label">Desde<input type="time" value={bloqueo.desde} onChange={(e) => setBloqueo({ ...bloqueo, desde: e.target.value })} className="input" /></label>
              <label className="label">Hasta<input type="time" value={bloqueo.hasta} onChange={(e) => setBloqueo({ ...bloqueo, hasta: e.target.value })} className="input" /></label>
            </div>
            <label className="label">Motivo
              <input required value={bloqueo.motivo} placeholder="Lluvia, mantenimiento, evento…" onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })} className="input" />
            </label>
            <button type="submit" className="boton boton-danger boton-block"><Lock size={15} /> Bloquear</button>
          </form>
        </section>
      </div>

      {/* ===== Panel de acciones (reserva seleccionada) ===== */}
      {sel && (
        <section className="panel" style={{ marginTop: '0.9rem' }} aria-label={`Reserva ${sel.reserva_id}`}>
          <div className="panel-header">
            <span className="panel-titulo">
              Reserva #{sel.reserva_id} · {sel.cliente}
              <Badge variant={estadosReserva[sel.estado ?? 'pendiente_seña'] ?? 'neutral'} style={{ marginLeft: '0.5rem' }}>
                {sel.estado ?? ''}
              </Badge>
            </span>
            <button type="button" className="dialog-cerrar" onClick={() => setSel(null)} aria-label="Cerrar">
              <X size={15} />
            </button>
          </div>
          <div className="panel-body" style={{ gridTemplateColumns: 'none' }}>
            {sel.estado === 'pendiente_seña' && (
              <div className="fila">
                <label className="label" style={{ marginBottom: 0, flex: '1 1 12rem' }}>
                  Método de pago
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="input">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </label>
                <button type="button" className="boton boton-primario" onClick={() => void cambiarEstado('confirmada')}>
                  <BadgeCheck size={15} /> Confirmar pago
                </button>
              </div>
            )}
            {sel.estado === 'confirmada' && (
              <button type="button" className="boton boton-secundario" onClick={() => void cambiarEstado('completada')}>
                Marcar completada
              </button>
            )}
            {(sel.estado === 'pendiente_seña' || sel.estado === 'confirmada') && (
              <button type="button" className="boton boton-danger" onClick={() => void cambiarEstado('cancelada')}>
                Cancelar reserva
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
