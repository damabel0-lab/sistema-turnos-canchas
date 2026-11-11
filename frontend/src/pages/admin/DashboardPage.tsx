import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  CalendarDays,
  BadgeDollarSign,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  ArrowRight,
  Grid3x3,
  Ticket,
  Wallet,
  Trophy,
  RefreshCw,
} from 'lucide-react';

interface ResumenDashboard {
  fecha: string;
  reservas_hoy: number;
  pendientes_seña: number;
  confirmadas: number;
  completadas: number;
  ingresos_dia: number;
  abonos_por_vencer: number;
}

export function DashboardPage() {
  const [datos, setDatos] = useState<ResumenDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await api<ResumenDashboard>('/dashboard/resumen'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando dashboard');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const fechaLegible = datos
    ? new Date(`${datos.fecha}T00:00:00`).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <div className="admin-page">
      {/* Encabezado */}
      <div className="fila-entre" style={{ marginBottom: '1.1rem' }}>
        <div>
          <h1 className="titulo" style={{ fontSize: '1.6rem', marginBottom: '0.1rem' }}>
            Panel general
          </h1>
          <p className="subtitulo" style={{ margin: 0, textTransform: 'capitalize' }}>
            {fechaLegible || 'Resumen del día'}
          </p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar()} disabled={cargando}>
          <RefreshCw size={15} /> {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="alerta-error" role="alert">
          {error}
        </div>
      )}

      {datos && (
        <>
          {/* Métricas del día */}
          <div className="metricas" style={{ marginBottom: '1.25rem' }}>
            <div className="metrica">
              <div className="metrica-icono verde"><CalendarDays size={20} /></div>
              <div className="metrica-label">Reservas hoy</div>
              <div className="metrica-valor">{datos.reservas_hoy}</div>
            </div>

            <div className="metrica">
              <div className="metrica-icono azul"><UserCheck size={20} /></div>
              <div className="metrica-label">Confirmadas</div>
              <div className="metrica-valor">{datos.confirmadas}</div>
            </div>

            <div className="metrica">
              <div className="metrica-icono ambar"><ClipboardList size={20} /></div>
              <div className="metrica-label">Pendientes de seña</div>
              <div className="metrica-valor">{datos.pendientes_seña}</div>
            </div>

            <div className="metrica">
              <div className="metrica-icono verde"><ClipboardCheck size={20} /></div>
              <div className="metrica-label">Completadas</div>
              <div className="metrica-valor">{datos.completadas}</div>
            </div>

            <div className="metrica">
              <div className="metrica-icono verde"><BadgeDollarSign size={20} /></div>
              <div className="metrica-label">Ingresos hoy</div>
              <div className="metrica-valor">${datos.ingresos_dia}</div>
            </div>

            <div className="metrica">
              <div className="metrica-icono rojo"><AlertTriangle size={20} /></div>
              <div className="metrica-label">Abonos por vencer</div>
              <div className="metrica-valor">{datos.abonos_por_vencer}</div>
            </div>
          </div>

          {/* Accesos rápidos */}
          <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.6rem' }}>
            Accesos rápidos
          </h2>
          <div className="metricas">
            <Link to="/admin/grilla" className="acceso-rapido">
              <Grid3x3 size={22} />
              <div>
                <div className="acceso-rapido-titulo">Grilla del día</div>
                <div className="acceso-rapido-sub">Turnos, bloqueos y carga rápida</div>
              </div>
              <ArrowRight size={16} className="acceso-rapido-flecha" />
            </Link>
            <Link to="/admin/vender-abono" className="acceso-rapido">
              <Ticket size={22} />
              <div>
                <div className="acceso-rapido-titulo">Vender abono</div>
                <div className="acceso-rapido-sub">gym / pileta mensuales</div>
              </div>
              <ArrowRight size={16} className="acceso-rapido-flecha" />
            </Link>
            <Link to="/admin/caja" className="acceso-rapido">
              <Wallet size={22} />
              <div>
                <div className="acceso-rapido-titulo">Caja</div>
                <div className="acceso-rapido-sub">Movimientos y CSV</div>
              </div>
              <ArrowRight size={16} className="acceso-rapido-flecha" />
            </Link>
            <Link to="/admin/torneos" className="acceso-rapido">
              <Trophy size={22} />
              <div>
                <div className="acceso-rapido-titulo">Torneos</div>
                <div className="acceso-rapido-sub">Crear, equipos y partidos</div>
              </div>
              <ArrowRight size={16} className="acceso-rapido-flecha" />
            </Link>
          </div>
        </>
      )}

      {!datos && !error && (
        <div className="metricas">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="metrica" style={{ opacity: 0.5 }}>
              <div className="metrica-icono verde"><CheckCircle2 size={20} /></div>
              <div className="metrica-label">Cargando…</div>
              <div className="metrica-valor">—</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
