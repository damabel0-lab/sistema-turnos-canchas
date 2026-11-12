import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { hoyISOLocal } from '../../lib/fecha';
import { useAuth } from '../../hooks/useAuth';
import { useComplejo } from '../../hooks/useComplejo';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Card, Button, Input } from '../../components/ui';
import { MapPin, Loader2, CheckCircle2, Building2, Dumbbell, Waves, Trophy, ArrowRight, Users, Calendar } from 'lucide-react';

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
  caracteristicas?: string | null;
  deportes?: { nombre: string; tipo: string } | null;
}

interface EstadoHora {
  hora: string;
  estado: 'libre' | 'ocupada' | 'bloqueada';
}

interface Cotizacion {
  precio_total: number;
  monto_seña: number;
  descuento_socio: number;
  descuento_turno_fijo: number;
}

interface ComplejoPicker {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  ciudad: string | null;
  direccion: string | null;
  gym: boolean;
  pileta: boolean;
  ofrece_torneos: boolean;
  ofrece_socios: boolean;
  amenidades: string[];
  canchas: number;
}

const hoy = () => hoyISOLocal();

/** '20:15' + 1h -> '21:15' */
function sumarUnaHora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Próximos n días en formato útil para la tira rápida (iso local + etiqueta corta). */
function proximosDias(n: number) {
  const base = new Date();
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const out: Array<{ iso: string; diaCorto: string; numero: number; esHoy: boolean }> = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ iso, diaCorto: DIAS[d.getDay()], numero: d.getDate(), esHoy: i === 0 });
  }
  return out;
}

export function ReservarPage() {
  const { session } = useAuth();
  const { toasts, mostrar, cerrar } = useToast();
  const { activoId, seleccionar, esStaffActivo } = useComplejo();
  const [searchParams] = useSearchParams();
  const slugParam = searchParams.get('complejo');
  const navigate = useNavigate();
  const [complejoNombre, setComplejoNombre] = useState<string | null>(null);
  const [complejoResolviendo, setComplejoResolviendo] = useState(true);
  const [picker, setPicker] = useState<ComplejoPicker[] | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Resolver el nombre del complejo activo:
  // 1) ?complejo=slug en la URL gana sobre todo
  // 2) Staff con complejo activo persistido (Admin PlayControl → complejo #1) usa su nombre por defecto
  // 3) Sin nada activo → picker (players: reset)
  useEffect(() => {
    let cancelado = false;
    setComplejoResolviendo(true);

    const slug = slugParam;
    if (slug) {
      // URL con complejo: cargar detalle, fijar contexto y nombre
      api<{ id: number; nombre: string; slug: string }>(`/complejos/${slug}`)
        .then((d) => {
          if (cancelado) return;
          seleccionar(d.id, d.slug);
          setComplejoNombre(d.nombre);
          setComplejoResolviendo(false);
        })
        .catch(() => {
          if (cancelado) return;
          seleccionar(null);
          setComplejoNombre(null);
          setComplejoResolviendo(false);
        });
      return () => {
        cancelado = true;
      };
    }

    // Sin slugParam: staff con complejo activo de localStorage mantiene su contexto; así nos aseguramos de que el caption nunca quede vacío
    if (activoId != null) {
      api<Array<{ complejo_id: number; rol: string; complejo: { id: number; nombre: string; slug: string } | null; vigente: boolean }>>('/complejos/mi')
        .then((mis) => {
          if (cancelado) return;
          const m = mis.find((x) => x.complejo_id === activoId);
          setComplejoNombre(m?.complejo?.nombre ?? null);
          setComplejoResolviendo(false);
        })
        .catch(() => {
          if (!cancelado) setComplejoResolviendo(false);
        });
      return () => {
        cancelado = true;
      };
    }

    // Nada persistido → mostrar picker
    seleccionar(null);
    setComplejoNombre(null);
    setError(null);
    setComplejoResolviendo(false);
    return () => undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, activoId]);

  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [deporteId, setDeporteId] = useState<number | null>(null);
  const [canchaId, setCancaId] = useState<number | null>(null);

  // Preseleccionar cancha desde deep link ?cancha=N (desde el perfil del complejo)
  const canchaParam = searchParams.get('cancha');
  useEffect(() => {
    if (!canchaParam || canchas.length === 0) return;
    const c = canchas.find((x) => x.id === Number(canchaParam));
    if (c) {
      setDeporteId(c.deporte_id);
      setCancaId(c.id);
    }
  }, [canchaParam, canchas]);
  const [fecha, setFecha] = useState(hoy());
  const [horas, setHoras] = useState<EstadoHora[]>([]);
  const [horaSel, setHoraSel] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [paraOtraPersona, setParaOtraPersona] = useState(false);
  const [otraNombre, setOtraNombre] = useState('');
  const [otraTelefono, setOtraTelefono] = useState('');
  const [confirmada, setConfirmada] = useState<{ id: number } | null>(null);

  const canchasDelDeporte = canchas.filter((c) => c.activa && c.deporte_id === deporteId);

  useEffect(() => {
    api<Deporte[]>('/deportes').then(setDeportes).catch((e) => setError(e.message));
  }, []);

  // Catálogo de complejos (para el picker cuando no hay complejo elegido)
  useEffect(() => {
    if (activoId || complejoResolviendo) return;
    let cancelado = false;
    setPickerError(null);
    api<ComplejoPicker[]>('/complejos')
      .then((list) => {
        if (!cancelado) setPicker(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelado) setPickerError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activoId, complejoResolviendo]);

  const irAReservar = (c: ComplejoPicker) => {
    // Se persiste el nombre inmediatamente para que el hint refleje el complejo correcto desde el instante uno
    setComplejoNombre(c.nombre);
    seleccionar(c.id, c.slug);
    navigate(`/reservar?complejo=${c.slug}`);
  };

  useEffect(() => {
    if (!activoId) {
      setCanchas([]);
      return;
    }
    api<Cancha[]>('/canchas').then(setCanchas).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activoId]);

  /** true si el turno ya empezó (solo aplica cuando la fecha es hoy) */
  const turnoYaPaso = (hora: string): boolean => {
    if (fecha !== hoy()) return false;
    const ahora = new Date();
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m <= ahoraMin;
  };

  // Cargar disponibilidad cuando cambia cancha o fecha
  useEffect(() => {
    setHoraSel(null);
    setCotizacion(null);
    if (!canchaId) {
      setHoras([]);
      return;
    }
    api<EstadoHora[]>(`/reservas/disponibilidad?cancha_id=${canchaId}&fecha=${fecha}`)
      .then(setHoras)
      .catch((e) => setError(e.message));
  }, [canchaId, fecha]);

  // Cotizar al elegir hora (turno de exactamente 60 minutos)
  useEffect(() => {
    setCotizacion(null);
    if (!canchaId || !horaSel) return;

    const [h, m] = horaSel.split(':').map(Number);
    const base = new Date();
    base.setHours(h, m, 0, 0);
    const finDate = new Date(base.getTime() + 60 * 60 * 1000);
    const fin = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}`;

    api<Cotizacion>('/canchas/cotizar', {
      method: 'POST',
      body: JSON.stringify({
        cancha_id: canchaId,
        fecha,
        hora_inicio: horaSel,
        hora_fin: fin,
        usuario_id: session?.user.id ?? null,
      }),
    })
      .then(setCotizacion)
      .catch((e) => setError(e.message));
  }, [canchaId, horaSel, fecha, session?.user.id]);

  async function confirmar() {
    if (!canchaId || !horaSel || !cotizacion) return;
    if (paraOtraPersona && (!otraNombre.trim() || !otraTelefono.trim())) {
      mostrar('Completá nombre y teléfono de la persona.', 'warning');
      return;
    }
    setCreando(true);
    setError(null);
    try {
      const [h, m] = horaSel.split(':').map(Number);
      const base = new Date();
      base.setHours(h, m, 0, 0);
      const finDate = new Date(base.getTime() + 60 * 60 * 1000);
      const fin = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}`;
      const reserva = await api<{ id: number; usuario_id?: string | null }>('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          cancha_id: canchaId,
          fecha,
          hora_inicio: horaSel,
          hora_fin: fin,
          precio_total: cotizacion.precio_total,
          monto_seña: cotizacion.monto_seña,
          metodo_pago: cotizacion.monto_seña > 0 ? null : 'efectivo',
          estado: cotizacion.monto_seña > 0 ? 'pendiente_seña' : 'confirmada',
          ...(paraOtraPersona
            ? { cliente_nombre: otraNombre.trim(), cliente_telefono: otraTelefono.trim() }
            : {}),
        }),
      });
      setConfirmada(reserva);
      setHoras((prev) =>
        prev.map((h) => (h.hora === horaSel ? { ...h, estado: 'ocupada' as const } : h))
      );
      mostrar('¡Reserva confirmada!', 'success');
      setHoraSel(null);
      setCotizacion(null);
      // Limpiar el "otra persona" después de reservar como mostrador
      if (paraOtraPersona) {
        setOtraNombre('');
        setOtraTelefono('');
        setParaOtraPersona(false);
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo crear la reserva';
      const esOcupada = /reservado|ocupada|bloquead/i.test(mensaje);
      setError(mensaje);
      if (esOcupada) {
        mostrar('Ese horario ya fue reservado o bloqueado. Elegí otro horario.', 'danger');
        setHoraSel(null);
        setCotizacion(null);
      }
      // Refrescar la grilla: marcar slots tomados correctamente aunque la página estuviera vieja
      if (canchaId) {
        api<EstadoHora[]>(`/reservas/disponibilidad?cancha_id=${canchaId}&fecha=${fecha}`)
          .then(setHoras)
          .catch(() => {});
      }
    } finally {
      setCreando(false);
    }
  }

  const deporteSel = deportes.find((d) => d.id === deporteId);
  const canchaSel = canchas.find((c) => c.id === canchaId);
  const fechaLegible = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="pagina-cliente">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />
      {/* Encabezado unificado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Mi cuenta · Reservar</span>
          <h1 className="pagina-titulo">Reservá tu cancha</h1>
          <p className="pagina-sub">Disciplina, cancha y horario — todo en un solo vistazo.</p>
        </div>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      {!complejoResolviendo && !activoId ? (
        <section aria-label="Elegí dónde jugar">
          <div className="fila-entre" style={{ marginBottom: '0.65rem' }}>
            <div>
              <span className="pagina-eyebrow">Elegí tu complejo</span>
              <h2 className="titulo" style={{ margin: 0, fontSize: '1.15rem' }}>¿Dónde vas a jugar?</h2>
            </div>
            <Link to="/complejos" className="fila" style={{ gap: '0.35rem', color: 'var(--texto-2)', fontSize: '0.85rem' }}>
              Ver catálogo <ArrowRight size={15} />
            </Link>
          </div>

          {pickerError && <div className="alerta-error" role="alert">{pickerError}</div>}

          {picker === null ? (
            <div className="stack" style={{ gap: '0.9rem' }}>
              {[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: '9rem' }} />)}
            </div>
          ) : picker.length === 0 ? (
            <div className="empty-state">
              <Building2 size={34} strokeWidth={1.6} style={{ color: 'var(--texto-3)' }} />
              <h3 className="titulo" style={{ margin: 0 }}>No hay complejos disponibles</h3>
              <p className="texto-sec" style={{ margin: 0 }}>Por ahora no hay complejos vigentes. Volvé pronto.</p>
            </div>
          ) : (
            <div className="reserva-complejos-grid">
              {picker.map((c) => (
                <article key={c.id} className="reserva-complejo-card" aria-label={`Complejo ${c.nombre}`}>
                  {/* Badges superiores */}
                  <div className="amenity-row">
                    <span className={`badge ${c.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
                      {c.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo'}
                    </span>
                    {c.ofrece_torneos && <span className="badge badge-exito"><Trophy size={11} /> Torneos</span>}
                    {c.gym && <span className="badge badge-info"><Dumbbell size={11} /> Gym</span>}
                    {c.pileta && <span className="badge badge-info"><Waves size={11} /> Pileta</span>}
                    {c.ofrece_socios && <span className="badge badge-neutro"><Users size={11} /> Socios</span>}
                  </div>

                  {/* Nombre + dirección */}
                  <h3 className="reserva-complejo-nombre">{c.nombre}</h3>
                  <p className="reserva-complejo-meta">
                    <MapPin size={13} aria-hidden /> {c.direccion ?? 'Sin dirección'}{c.ciudad ? `, ${c.ciudad}` : ''}
                  </p>
                  <p className="texto-debil" style={{ margin: 0, fontSize: '0.8rem' }}>{c.canchas} cancha{c.canchas === 1 ? '' : 's'} disponibles</p>

                  {/* CTA alineado al pie, ocupa todo el ancho */}
                  <button
                    type="button"
                    className="boton boton-primario boton-block reserva-complejo-cta"
                    onClick={() => irAReservar(c)}
                  >
                    Reservar aquí <ArrowRight size={17} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {activoId && (
            <div className="fila-entre" style={{ marginBottom: '0.65rem' }}>
              <p className="texto-sec" style={{ margin: 0 }}>
                <Building2 size={15} style={{ verticalAlign: '-3px', marginRight: '0.35rem' }} aria-hidden />
                Reservando en <strong>{complejoNombre ?? slugParam ?? 'seleccionado'}</strong>
              </p>
              <button
                type="button"
                className="boton boton-ghost"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.7rem' }}
                onClick={() => {
                  seleccionar(null);
                  setError(null);
                  navigate('/reservar', { replace: true });
                }}
              >
                Cambiar
              </button>
            </div>
          )}
          {confirmada ? (
        <Card className="caja-vacia">
          <div className="icono-circulo" style={{ margin: '0 auto 0.75rem' }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ margin: '0 0 0.25rem' }}>¡Reserva #{confirmada.id} confirmada!</h3>
          <p className="texto-sec">
            {canchaSel ? `${canchaSel.nombre} · ` : ''}Si la reserva tiene seña, abonala en el complejo para dejarla confirmada.
          </p>
          <div className="fila" style={{ justifyContent: 'center', marginTop: '0.85rem' }}>
            <Link to="/mis-reservas" className="boton boton-primario">
              Ver mis reservas
            </Link>
            <button type="button" className="boton boton-outline" onClick={() => setConfirmada(null)}>
              Hacer otra reserva
            </button>
          </div>
        </Card>
      ) : (
        <div className="reserva-layout-2col">
          {/* ===== Columna izquierda: flujo apilado compacto ===== */}
          <div className="stack" style={{ gap: '0.75rem' }}>
            <Card className="paso-card-h">
              <div className="paso-header">
                <span className="paso-num">1</span>
                <h2 className="titulo" style={{ fontSize: '0.95rem', margin: 0 }}>Disciplina</h2>
                {deporteId != null && <span className="texto-debil" style={{ marginLeft: 'auto', fontSize: '0.82rem' }}>{deporteSel?.nombre}</span>}
              </div>
              <div className="disciplina-bar">
                  {deportes.length === 0 && <p className="texto-debil">Cargando disciplinas…</p>}
                  {deportes.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`opcion-chip${deporteId === d.id ? ' activo' : ''}`}
                      onClick={() => {
                        setDeporteId(d.id);
                        setCancaId(null);
                      }}
                    >
                      {d.nombre}
                    </button>
                  ))}
              </div>
            </Card>

            <Card className="paso-card-h">
              <div className="paso-header">
                <span className="paso-num">2</span>
                <h2 className="titulo" style={{ fontSize: '0.95rem', margin: 0 }}>Cancha</h2>
                {canchaId != null && <span className="texto-debil" style={{ marginLeft: 'auto', fontSize: '0.82rem' }}>{canchaSel?.nombre}</span>}
              </div>
                {!deporteId ? (
                  <p className="texto-debil">Elegí una disciplina para ver sus canchas disponibles.</p>
                ) : canchasDelDeporte.length === 0 ? (
                  <p className="texto-sec">No hay canchas activas para esta disciplina.</p>
                ) : (
                  <div className="stack canchas-lista" style={{ gap: '0.5rem' }}>
                    {canchasDelDeporte.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`cancha-opcion${canchaId === c.id ? ' activo' : ''}`}
                        onClick={() => setCancaId(c.id)}
                        aria-pressed={canchaId === c.id}
                      >
                        <span className="cancha-opcion-icono"><MapPin size={16} /></span>
                        <span className="cancha-opcion-info">
                          <span className="cancha-opcion-nombre">{c.nombre}</span>
                          {c.caracteristicas && <span className="cancha-opcion-meta">{c.caracteristicas}</span>}
                        </span>
                        <span className="cancha-opcion-precio">
                          ${c.precio_base}
                          <small>/h</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

            <Card className="paso-card-h paso-card-fecha">
              <div className="paso-header">
                <span className="paso-num">3</span>
                <h2 className="titulo" style={{ fontSize: '0.95rem', margin: 0 }}>Fecha y horario</h2>
                <span className="texto-debil" style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>turnos de 1 h · :15 a :15</span>
              </div>

              {/* Tira horizontal de días + botón calendario */}
              <div className="dias-strip" role="group" aria-label="Próximos días">
                {proximosDias(7).map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => { setFecha(d.iso); setMostrarFecha(false); }}
                    className={`dia-chip${fecha === d.iso ? ' activo' : ''}`}
                    aria-pressed={fecha === d.iso}
                  >
                    <span className="dia-chip-dia">{d.esHoy ? 'Hoy' : d.diaCorto}</span>
                    <span className="dia-chip-num">{d.numero}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`dia-chip dia-chip-calendario${mostrarFecha ? ' activo' : ''}`}
                  onClick={() => setMostrarFecha((v) => !v)}
                  aria-label="Elegir otra fecha"
                  title="Elegir otra fecha"
                >
                  <Calendar size={17} />
                </button>
              </div>

              {/* Campo de fecha (solo visible al tocar el calendario) */}
              {mostrarFecha && (
                <label className="label" style={{ marginTop: '0.55rem' }}>
                  Otras fecha
                  <Input
                    id="fecha-reserva"
                    type="date"
                    value={fecha}
                    min={hoy()}
                    onChange={(e) => { setFecha(e.target.value); setMostrarFecha(false); }}
                    autoFocus
                  />
                </label>
              )}

              <div className="leyenda" style={{ margin: '0.55rem 0 0.5rem' }}>
                <span className="leyenda-item"><span className="leyenda-punto libre" /> Libre</span>
                <span className="leyenda-item"><span className="leyenda-punto ocupado" /> Ocupada</span>
                <span className="leyenda-item"><span className="leyenda-punto pasado" /> Pasado</span>
              </div>

              {!canchaId ? (
                <p className="texto-debil">Elegí una cancha para ver los horarios disponibles.</p>
              ) : (
                <div className="slots-grid">
                  {horas.map((h) => {
                    const pasado = turnoYaPaso(h.hora);
                    const libre = h.estado === 'libre' && !pasado;
                    const seleccionado = horaSel === h.hora;
                    const estadoClase = seleccionado
                      ? 'slot-seleccionado'
                      : libre
                        ? 'slot-libre'
                        : pasado
                          ? 'slot-pasado'
                          : h.estado === 'bloqueada'
                            ? 'slot-bloqueado'
                            : 'slot-ocupado';
                    return (
                      <button
                        key={h.hora}
                        type="button"
                        disabled={!libre}
                        onClick={() => setHoraSel(h.hora)}
                        aria-pressed={seleccionado}
                        title={
                          pasado
                            ? 'Ese turno ya pasó'
                            : libre
                              ? `${h.hora} a ${sumarUnaHora(h.hora)}`
                              : h.estado === 'ocupada'
                                ? 'Ocupada'
                                : 'Bloqueada'
                        }
                        className={`slot ${estadoClase}`}
                      >
                        <span className="slot-hora">{h.hora}</span>
                        <span className="slot-fin">a {sumarUnaHora(h.hora)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ===== Resumen (30% derecha · alto contenido · sticky) ===== */}
          <aside className="reserva-resumen-wrap">
            <Card className="resumen-card resumen-sticky">
                <div className="paso-header" style={{ marginBottom: '0.85rem' }}>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Resumen</h2>
                </div>

                <dl className="resumen-lista">
                  <div>
                    <dt>Disciplina</dt>
                    <dd>{deporteSel?.nombre ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Cancha</dt>
                    <dd>{canchaSel?.nombre ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd style={{ textTransform: 'capitalize' }}>{fechaLegible}</dd>
                  </div>
                  <div>
                    <dt>Horario</dt>
                    <dd>{horaSel ? `${horaSel} – ${sumarUnaHora(horaSel)} (1 h)` : '—'}</dd>
                  </div>
                </dl>

                <div className="divider" />

                {cotizacion ? (
                  <>
                    {cotizacion.descuento_socio > 0 && (
                      <div className="resumen-fila-desc">Descuento socio <span>-${cotizacion.descuento_socio}</span></div>
                    )}
                    {cotizacion.descuento_turno_fijo > 0 && (
                      <div className="resumen-fila-desc">Descuento turno fijo <span>-${cotizacion.descuento_turno_fijo}</span></div>
                    )}
                    {cotizacion.monto_seña > 0 && (
                      <div className="resumen-fila-senia">Seña a pagar en el complejo <span>${cotizacion.monto_seña}</span></div>
                    )}
                    <div className="resumen-total">
                      <span>Total</span>
                      <span>${cotizacion.precio_total}</span>
                    </div>
                  </>
                ) : (
                  <p className="texto-debil" style={{ margin: '0.25rem 0 0.75rem' }}>
                    El total aparece cuando elegís un horario.
                  </p>
                )}

                {/* Staff: asignar a otra persona en mostrador (mismo flujo que Carga rápida) */}
                {esStaffActivo && (
                  <div className="otra-persona">
                    <label className="fila" style={{ gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={paraOtraPersona}
                        onChange={(e) => setParaOtraPersona(e.target.checked)}
                      />
                      Reservar para otra persona (mostrador)
                    </label>
                    {paraOtraPersona && (
                      <div className="stack" style={{ gap: '0.45rem', marginTop: '0.35rem' }}>
                        <Input
                          name="otraNombre"
                          value={otraNombre}
                          onChange={(e) => setOtraNombre(e.target.value)}
                          placeholder="Nombre y apellido"
                          aria-label="Nombre y apellido de la persona"
                        />
                        <Input
                          name="otraTelefono"
                          value={otraTelefono}
                          onChange={(e) => setOtraTelefono(e.target.value)}
                          placeholder="+54 9 11 0000-0000"
                          aria-label="Teléfono"
                          inputMode="tel"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="resumen-cta">
                  <Button
                    variant="primary"
                    disabled={!session || creando || !canchaId || !horaSel || !cotizacion}
                    onClick={confirmar}
                    className="boton-block"
                  >
                    {creando ? (
                      <><Loader2 size={16} /> Creando…</>
                    ) : !session ? (
                      'Iniciá sesión para reservar'
                    ) : cotizacion && cotizacion.monto_seña > 0 ? (
                      `Reservar y señar $${cotizacion.monto_seña}`
                    ) : (
                      'Confirmar reserva'
                    )}
                  </Button>
                  <p className="texto-debil" style={{ textAlign: 'center', margin: 0 }}>
                    Cancelación sin cargo hasta 2 h antes del turno
                  </p>
                </div>
            </Card>
          </aside>
        </div>
          )}
        </>
      )}
    </main>
  );
}
