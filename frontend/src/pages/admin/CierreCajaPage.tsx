import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Configuracion {
  nombre: string | null;
  hora_apertura: number;
  hora_cierre: number;
  cancelacion_minima_horas: number;
  seña_obligatoria: boolean;
}

interface Resumen {
  desde: string;
  hasta: string;
  ingresos: number;
  egresos: number;
  saldo: number;
  por_metodo_pago: Record<string, number>;
  por_origen: Array<{ origen: string; total: number; movimientos: number }>;
  movimientos: Array<{
    id: number;
    fecha_hora: string;
    tipo_movimiento: string;
    monto: number;
    metodo_pago: string;
    descripcion: string;
  }>;
}

const nombreMes = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;
const precio = (n: number) => `$${Math.abs(n).toLocaleString('es-AR')}`;

export function CierreCajaPage() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api<Configuracion>('/config'),
      api<Resumen>('/caja/resumen?periodo=dia'),
    ]).then(([cfgRes, rejRes]) => {
      if (cfgRes.status === 'fulfilled') setConfig(cfgRes.value);
      else setConfig({ nombre: 'Mi complejo', hora_apertura: 8, hora_cierre: 23, cancelacion_minima_horas: 0, seña_obligatoria: false });

      if (rejRes.status === 'fulfilled') setResumen(rejRes.value);
      else setError(rejRes.reason instanceof Error ? rejRes.reason.message : 'Error cargando caja');
    });
  }, []);

  // Auto-print once data loads — user can cancel or save
  useEffect(() => {
    if (resumen && config) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [resumen, config]);

  const fecha = new Date();
  const nombreMesCompleto = nombreMes[fecha.getMonth()];
  const fechaLinea = `${String(fecha.getDate()).padStart(2, '0')} de ${nombreMesCompleto} de ${fecha.getFullYear()}`;

  if (error) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>No se pudo cargar el cierre de caja</h1>
        <p role="alert">{error}</p>
        <button type="button" className="boton boton-primario" onClick={() => window.location.reload()}>Reintentar</button>
      </main>
    );
  }

  return (
    <main className="cierre-page">
      <button className="cierre-print-btn no-print" type="button" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>

      <header className="cierre-header">
        <div>
          <div className="cierre-brand">PlayControl</div>
          <div className="cierre-complej">{config?.nombre ?? 'Club'}</div>
        </div>
        <div className="cierre-header-right">
          <div className="cierre-tag">Cierre de caja</div>
          <div className="cierre-fecha">{fechaLinea}</div>
          {config && (
            <div className="cierre-horario">Horario: {hora(config.hora_apertura)} a {hora(config.hora_cierre)} hs.</div>
          )}
        </div>
      </header>

      <h1 className="cierre-titulo">Reporte de cierre de caja — {fechaLinea}</h1>

      {/* Detalle de movimientos */}
      <h2>1. Detalle de movimientos</h2>
      {resumen?.movimientos.length === 0 ? (
        <p className="cierre-empty">Sin movimientos registrados para el día operativo.</p>
      ) : (
        <table className="cierre-tabla">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Descripción</th>
              <th>Método</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {(resumen?.movimientos ?? []).map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{m.descripcion}</td>
                <td>{m.metodo_pago}</td>
                <td>{m.tipo_movimiento === 'ingreso' ? 'INGRESO' : 'EGRESO'}</td>
                <td className={m.tipo_movimiento === 'ingreso' ? 'monto-ingreso' : 'monto-egreso'} style={{ textAlign: 'right' }}>
                  {m.tipo_movimiento === 'ingreso' ? '+' : '−'}{precio(m.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Resumen */}
      <h2>2. Resumen del día</h2>
      <table className="cierre-tabla cierre-totales">
        <tbody>
          <tr><th scope="row">Total ingresos</th><td style={{ textAlign: 'right' }} className="monto-ingreso">+{precio(resumen?.ingresos ?? 0)}</td></tr>
          <tr><th scope="row">Total egresos</th><td style={{ textAlign: 'right' }} className="monto-egreso">−{precio(resumen?.egresos ?? 0)}</td></tr>
          <tr className="cierre-saldo"><th scope="row"><strong>Saldo del día</strong></th><td style={{ textAlign: 'right' }}><strong>{precio(resumen?.saldo ?? 0)}</strong></td></tr>
        </tbody>
      </table>

      {/* Por origen */}
      {resumen?.por_origen.length ? (
        <>
          <h2>3. Origen del ingreso</h2>
          <table className="cierre-tabla">
            <thead>
              <tr><th>Origen</th><th>Mov.</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {resumen.por_origen.map((o) => (
                <tr key={o.origen}>
                  <td>{o.origen}</td>
                  <td>{o.movimientos}</td>
                  <td style={{ textAlign: 'right' }}>{precio(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {/* Por método */}
      {resumen && Object.keys(resumen.por_metodo_pago).length > 0 && (
        <>
          <h2>4. Según método de pago</h2>
          <table className="cierre-tabla">
            <thead>
              <tr><th>Método</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {Object.entries(resumen.por_metodo_pago).map(([metodo, total]) => (
                <tr key={metodo}>
                  <td style={{ textTransform: 'capitalize' }}>{metodo}</td>
                  <td style={{ textAlign: 'right' }}>{precio(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Firma */}
      <div className="cierre-firma">
        <div>
          <div className="cierre-firma-linea" />
          <div className="cierre-firma-etiqueta">Responsable de Caja</div>
        </div>
        <div>
          <div className="cierre-firma-linea" />
          <div className="cierre-firma-etiqueta">Dueño / Supervisora</div>
        </div>
      </div>

      <footer className="cierre-footer">
        <small>PlayControl · generado {new Date().toLocaleString('es-AR')}</small>
      </footer>
    </main>
  );
}
