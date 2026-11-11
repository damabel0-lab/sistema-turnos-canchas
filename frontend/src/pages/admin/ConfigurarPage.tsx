import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui';
import {
  Goal,
  Building2,
  ShieldCheck,
  Dumbbell,
  Users,
  Grid3x3,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

interface CanchaNueva {
  nombre: string;
  deporte_id: string;
  precio_base: string;
  activa: boolean;
  caracteristicas: string;
}

const PASO_DEF: Array<{ label: string; subtitulo: string; icon: LucideIcon }> = [
  { label: 'Bienvenida', subtitulo: 'Tipo de complejo', icon: Goal },
  { label: 'Datos del complejo', subtitulo: 'Nombre y horario', icon: Building2 },
  { label: 'Políticas', subtitulo: 'Cancelaciones y descuentos', icon: ShieldCheck },
  { label: 'Amenidades', subtitulo: 'Gimnasio y pileta', icon: Dumbbell },
  { label: 'Socios', subtitulo: 'Membresía y beneficios', icon: Users },
  { label: 'Cantidad de canchas', subtitulo: 'Cuántas necesitás', icon: Grid3x3 },
  { label: 'Datos de canchas', subtitulo: 'Nombre, deporte, precio', icon: MapPin },
  { label: 'Finalizar', subtitulo: 'Publicar complejo', icon: CheckCircle2 },
];

export function ConfigurarPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const { toasts, mostrar, cerrar } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<'fraccionado' | 'complejo_deportivo'>('fraccionado');
  const [nombre, setNombre] = useState('');
  const [horaApertura, setHoraApertura] = useState('08:00');
  const [horaCierre, setHoraCierre] = useState('23:00');
  const [cancelacionHoras, setCancelacionHoras] = useState('2');
  const [descuentoTurnoFijo, setDescuentoTurnoFijo] = useState('10');
  const [gym, setGym] = useState(false);
  const [pileta, setPileta] = useState(false);
  const [socios, setSocios] = useState(false);

  const [cantidadCanchas, setCantidadCanchas] = useState('1');
  const [canchasNuevas, setCanchasNuevas] = useState<CanchaNueva[]>([
    { nombre: '', deporte_id: '', precio_base: '', activa: true, caracteristicas: '' },
  ]);

  useEffect(() => {
    api<Deporte[]>('/deportes')
      .then(setDeportes)
      .catch(() => setDeportes([]));
  }, []);

  async function guardarTodo() {
    setGuardando(true);
    setError(null);

    try {
      await api('/admin/setup', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          nombre,
          hora_apertura: Number(horaApertura.split(':')[0]),
          hora_cierre: Number(horaCierre.split(':')[0]),
          politica_cancelacion_horas: Number(cancelacionHoras),
          descuento_turno_fijo_porcentaje: Number(descuentoTurnoFijo),
          gym,
          pileta,
          socios,
        }),
      });

      for (const cancha of canchasNuevas) {
        if (!cancha.nombre.trim() || !cancha.deporte_id || !cancha.precio_base) continue;
        try {
          await api('/canchas', {
            method: 'POST',
            body: JSON.stringify({
              nombre: cancha.nombre.trim(),
              deporte_id: Number(cancha.deporte_id),
              precio_base: Number(cancha.precio_base),
              activa: cancha.activa,
              caracteristicas: cancha.caracteristicas || null,
            }),
          });
        } catch (e) {
          setError(
            e instanceof Error
              ? `Error al crear cancha "${cancha.nombre}": ${e.message}`
              : 'Error desconocido al crear cancha',
          );
          setGuardando(false);
          return;
        }
      }

      mostrar('Complejo configurado', 'success');
      navigate('/admin/dashboard', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar configuración');
    } finally {
      setGuardando(false);
    }
  }

  const hayCanchasCargadas = canchasNuevas.some((c) => c.nombre.trim() && c.precio_base && c.deporte_id);
  const pasoDef = PASO_DEF[paso];
  const pasoDefProx = PASO_DEF[paso + 1];
  const PasoActualIcono = pasoDef.icon;

  const pasos: Array<{ contenido: ReactNode }> = [
    // Paso 0 — Bienvenida y tipo
    {
      contenido: (
        <div className="wizard-opciones" role="radiogroup" aria-label="Tipo de complejo">
          <button
            type="button"
            role="radio"
            aria-checked={tipo === 'fraccionado'}
            onClick={() => setTipo('fraccionado')}
            className={`wizard-opcion${tipo === 'fraccionado' ? ' activo' : ''}`}
          >
            <Goal size={26} style={{ color: 'var(--primario-2)' }} />
            <span className="wizard-opcion-titulo">Cancha individual</span>
            <span className="wizard-opcion-sub">Un único espacio, ideal si sos una cancha o un fraccionado.</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tipo === 'complejo_deportivo'}
            onClick={() => setTipo('complejo_deportivo')}
            className={`wizard-opcion${tipo === 'complejo_deportivo' ? ' activo' : ''}`}
          >
            <Building2 size={26} style={{ color: 'var(--primario-2)' }} />
            <span className="wizard-opcion-titulo">Complejo deportivo</span>
            <span className="wizard-opcion-sub">Varias canchas, múltiples deportes, amenidades y servicios.</span>
          </button>
        </div>
      ),
    },
    // Paso 1 — Datos del complejo
    {
      contenido: (
        <div className="stack">
          <label className="label">Nombre comercial
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" required autoFocus placeholder="Ej: Club De Amigos 1886" />
          </label>
          <div className="grid-2">
            <label className="label">Horario de apertura<input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} className="input" /></label>
            <label className="label">Horario de cierre<input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} className="input" /></label>
          </div>
        </div>
      ),
    },
    // Paso 2 — Políticas
    {
      contenido: (
        <div className="stack">
          <label className="label">
            Horas mínimas para cancelar antes del turno
            <input type="number" min={0} max={48} value={cancelacionHoras} onChange={(e) => setCancelacionHoras(e.target.value)} className="input" />
          </label>
          <label className="label">
            Descuento para clientes con turno fijo (%)
            <input type="number" min={0} max={100} value={descuentoTurnoFijo} onChange={(e) => setDescuentoTurnoFijo(e.target.value)} className="input" />
          </label>
        </div>
      ),
    },
    // Paso 3 — Amenidades
    {
      contenido: (
        <div className="stack">
          <label className="fila" style={{ gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={gym} onChange={(e) => setGym(e.target.checked)} />
            Gimnasio activo
          </label>
          <label className="fila" style={{ gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={pileta} onChange={(e) => setPileta(e.target.checked)} />
            Pileta activa
          </label>
          <p className="texto-sec" style={{ margin: 0 }}>
            Si los activás, en el panel vas a poder definir precio mensual y el cliente puede pedir su mensualidad desde la app.
          </p>
        </div>
      ),
    },
    // Paso 4 — Socios
    {
      contenido: (
        <div className="stack">
          <label className="fila" style={{ gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={socios} onChange={(e) => setSocios(e.target.checked)} />
            Ofreceré socios con descuentos
          </label>
          <p className="texto-sec" style={{ margin: 0 }}>
            Activás el módulo de socios: beneficios por disciplina, % descuento y directorio de socios. No es obligatorio.
          </p>
        </div>
      ),
    },
    // Paso 5 — ¿Cuántas canchas?
    {
      contenido: (
        <div className="stack">
          <label className="label">
            Cantidad de canchas / sectores
            <input
              type="number"
              min={1}
              max={30}
              value={cantidadCanchas}
              onChange={(e) => {
                const n = Math.min(Math.max(Number(e.target.value) || 1, 1), 30);
                setCantidadCanchas(String(n));
                setCanchasNuevas((prev) => {
                  const nuevo = [...prev];
                  while (nuevo.length < n) {
                    nuevo.push({ nombre: '', deporte_id: '', precio_base: '', activa: true, caracteristicas: '' });
                  }
                  return nuevo.slice(0, n);
                });
              }}
              className="input"
            />
          </label>
          <p className="texto-sec" style={{ margin: 0 }}>Podés cargar los datos de cada cancha en el próximo paso.</p>
        </div>
      ),
    },
    // Paso 6 — Datos de cada cancha
    {
      contenido: (
        <div className="stack" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {canchasNuevas.map((cancha, i) => (
            <div key={i} className="tarjeta-plana" style={{ padding: '0.85rem' }}>
              <div className="fila-entre" style={{ marginBottom: '0.4rem' }}>
                <strong>Cancha {i + 1}</strong>
                <label className="fila" style={{ gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cancha.activa}
                    onChange={(e) => setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, activa: e.target.checked } : c)))}
                  />
                  Activa
                </label>
              </div>
              <div className="grid-2" style={{ gap: '0.5rem' }}>
                <label className="label" style={{ gridColumn: '1 / -1' }}>Nombre
                  <input value={cancha.nombre} onChange={(e) => setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, nombre: e.target.value } : c)))} className="input" placeholder="Ej: Cancha 1" />
                </label>
                <label className="label">Deporte
                  <select value={cancha.deporte_id} onChange={(e) => setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, deporte_id: e.target.value } : c)))} className="input">
                    <option value="">Elegir…</option>
                    {deportes.map((d) => (<option key={d.id} value={d.id}>{d.nombre}</option>))}
                  </select>
                </label>
                <label className="label">Precio/h ($)
                  <input type="number" min={0} value={cancha.precio_base} onChange={(e) => setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, precio_base: e.target.value } : c)))} className="input" />
                </label>
              </div>
              <label className="label">Características
                <input value={cancha.caracteristicas} placeholder="Ej: Iluminada, techada…" onChange={(e) => setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, caracteristicas: e.target.value } : c)))} className="input" />
              </label>
            </div>
          ))}
        </div>
      ),
    },
    // Paso 7 — Resumen y publicar
    {
      contenido: (
        <div className="stack">
          {/* Resumen en grilla */}
          <div className="grilla-stats-4" style={{ gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div className="stat-card"><div className="stat-label">Nombre</div><div className="stat-valor-chico">{nombre || '—'}</div></div>
            <div className="stat-card"><div className="stat-label">Tipo</div><div className="stat-valor-chico">{tipo === 'fraccionado' ? 'Cancha individual' : 'Complejo deportivo'}</div></div>
            <div className="stat-card"><div className="stat-label">Horario</div><div className="stat-valor-chico">{horaApertura} – {horaCierre}</div></div>
            <div className="stat-card"><div className="stat-label">Cancelar hasta</div><div className="stat-valor-chico">{cancelacionHoras} h antes</div></div>
            <div className="stat-card"><div className="stat-label">Turno fijo</div><div className="stat-valor-chico">{descuentoTurnoFijo}% DTO</div></div>
            <div className="stat-card"><div className="stat-label">Gimnasio</div><div className="stat-valor-chico">{gym ? 'Sí' : 'No'}</div></div>
            <div className="stat-card"><div className="stat-label">Pileta</div><div className="stat-valor-chico">{pileta ? 'Sí' : 'No'}</div></div>
            <div className="stat-card"><div className="stat-label">Socios</div><div className="stat-valor-chico">{socios ? 'Sí' : 'No'}</div></div>
            <div className="stat-card"><div className="stat-label">Canchas cargadas</div><div className="stat-valor-chico">{canchasNuevas.filter((c) => c.nombre.trim()).length}</div></div>
          </div>

          <div className="tarjeta-plana fila" style={{ padding: '0.75rem 0.9rem', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Todo listo para publicar</div>
              <div className="texto-debil">Al finalizar vas al Panel general con el complejo configurado.</div>
            </div>
            <button type="button" className="boton boton-primario" onClick={guardarTodo} disabled={guardando || !nombre.trim() || !hayCanchasCargadas}>
              {guardando ? (<><Loader2 size={16} /> Publicando…</>) : 'Publicar complejo'}
            </button>
          </div>
        </div>
      ),
    },
  ];

  const puedeAvanzar = paso === 0 ? true : paso === 1 ? nombre.trim().length >= 2 : paso === 6 ? hayCanchasCargadas : true;

  return (
    <div className="admin-page">
      <main className="pantalla" style={{ paddingTop: '1.1rem' }}>
        <ToastContainer toasts={toasts} onCerrar={cerrar} />

        <div className="wizard-layout">
          {/* ===== Sidebar con pasos ===== */}
          <aside className="wizard-sidebar" aria-label="Progreso del asistente">
            <div className="wizard-sidebar-brand">
              <span className="brand-mark" style={{ width: '2rem', height: '2rem', borderRadius: '0.55rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Goal size={18} strokeWidth={2.2} />
              </span>
              <div>
                <div className="admin-brand-name" style={{ fontSize: '0.9rem' }}>PlayControl</div>
                <div className="admin-brand-tag">Asistente de configuración</div>
              </div>
            </div>

            <ol className="wizard-steps">
              {PASO_DEF.map((pasoDef, i) => {
                const estado = i < paso ? 'hecho' : i === paso ? 'activo' : 'futuro';
                const Icono = pasoDef.icon;
                return (
                  <li key={i} className={`wizard-step ${estado}`}>
                    <span className="wizard-step-numero">
                      {estado === 'hecho' ? <CheckCircle2 size={13} /> : <Icono size={13} />}
                    </span>
                    <span>
                      <span className="wizard-step-titulo">{pasoDef.label}</span>
                      <span className="wizard-step-sub">{pasoDef.subtitulo}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="wizard-progreso">
              <span className="wizard-progreso-texto">Paso {paso + 1} · {Math.round(((paso + 1) / PASO_DEF.length) * 100)}%</span>
              <div className="wizard-progresion-track">
                <div className="wizard-progresion-fill" style={{ width: `${((paso + 1) / PASO_DEF.length) * 100}%` }} />
              </div>
            </div>
          </aside>

          {/* ===== Panel central ===== */}
          <section className="wizard-panel">
            <header className="wizard-encabezado">
              <span className="wizard-encabezado-icono"><PasoActualIcono size={26} /></span>
              <div className="wizard-encabezado-texto">
                <span className="wizard-paso-num">Paso {paso + 1} · de {PASO_DEF.length}</span>
                <h1 className="wizard-titulo">{pasoDef.label}</h1>
                <p className="wizard-sub">{pasoDef.subtitulo}</p>
              </div>
            </header>

            {error && <div className="alerta-error" role="alert">{error}</div>}

            <Card plano className="wizard-card">
              {pasos[paso].contenido}
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              {paso > 0 ? (
                <button type="button" className="boton boton-outline" onClick={() => setPaso((p) => Math.max(0, p - 1))}>
                  <ArrowLeft size={16} /> Atrás
                </button>
              ) : <span />}

              {paso < pasos.length - 1 ? (
                <button type="button" className="boton boton-primario" onClick={() => setPaso((p) => Math.min(pasos.length - 1, p + 1))} disabled={!puedeAvanzar}>
                  Siguiente {pasoDefProx ? `· ${pasoDefProx.label}` : ''} <ArrowRight size={16} />
                </button>
              ) : <span />}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
