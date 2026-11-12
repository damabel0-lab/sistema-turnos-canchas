import { useCallback, useEffect, useState } from 'react';
import { Building2, CircleCheck, ShieldAlert, Wallet, Users, Trophy, BadgeDollarSign, Ban } from 'lucide-react';
import { api } from '../../lib/api';
import { useComplejo } from '../../hooks/useComplejo';

interface Suscripcion {
  id: number;
  complejo_id: number;
  plan: string;
  estado: 'prueba' | 'activa' | 'vencida' | 'cancelada';
  monto: number;
  inicio: string;
  fin: string | null;
  metodo_pago: string | null;
  notas: string | null;
}

interface ItemPlataforma {
  complejo: {
    id: number;
    nombre: string;
    slug: string;
    tipo: string;
    ciudad: string | null;
    direccion: string | null;
    telefono: string | null;
    email_contacto: string | null;
    activo: boolean;
  };
  suscripcion: Suscripcion | null;
  vigente: boolean;
  duenos: string[];
}

interface Resumen {
  total: number;
  activos: number;
  en_prueba: number;
  en_activa: number;
  suspendidos: number;
  mrr: number;
}

const fmtPesos = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const METODO = (m: string | null) => (m === 'transferencia' ? 'Transferencia' : m === 'efectivo' ? 'Efectivo' : 'Otro');

function BadgeEstado({ sub, vigente }: { sub: Suscripcion | null; vigente: boolean }) {
  if (!sub) return <span className="badge badge-peligro">Sin suscripción</span>;
  if (sub.estado === 'prueba') {
    return <span className="badge badge-info">Trial{sub.fin ? ` · hasta ${sub.fin.slice(8, 10)}/${sub.fin.slice(5, 7)}` : ''}</span>;
  }
  if (sub.estado === 'activa' && vigente) {
    const cortesia = Number(sub.monto) === 0;
    return <span className="badge badge-exito">{cortesia ? 'Cortesía' : 'Activa'}{sub.fin ? ` · hasta ${sub.fin.slice(8, 10)}/${sub.fin.slice(5, 7)}/${sub.fin.slice(2, 4)}` : ''}</span>;
  }
  if (sub.estado === 'vencida') return <span className="badge badge-peligro">Vencida</span>;
  return <span className="badge badge-neutro">{sub.estado}</span>;
}

export function PlataformaPage() {
  const { esSuperAdmin } = useComplejo();
  const [data, setData] = useState<{ items: ItemPlataforma[]; resumen: Resumen } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  // Inline activation form state
  const [activarId, setActivarId] = useState<number | null>(null);
  const [suspenderId, setSuspenderId] = useState<number | null>(null);
  const [meses, setMeses] = useState(1);
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia' | 'otro'>('transferencia');
  const [monto, setMonto] = useState('50000');
  const [notas, setNotas] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setData(await api('/admin/suscripciones'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esSuperAdmin) void cargar();
    else setCargando(false);
  }, [esSuperAdmin, cargar]);

  if (!esSuperAdmin) {
    return (
      <main className="contenedor" style={{ paddingTop: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <ShieldAlert size={38} strokeWidth={1.6} style={{ margin: '0 auto 0.6rem', color: 'var(--peligro)' }} />
          <h1 className="titulo">Solo plataforma</h1>
          <p className="subtitulo" style={{ margin: 0 }}>Esta sección es exclusiva para el super admin de PlayControl.</p>
        </div>
      </main>
    );
  }

  const activar = async (id: number) => {
    setProcesando(true);
    setError(null);
    try {
      await api(`/admin/suscripciones/${id}/activar`, {
        method: 'POST',
        body: JSON.stringify({
          meses,
          metodo_pago: metodo,
          monto: Number(monto) || 0,
          notas: notas.trim() || undefined,
        }),
      });
      setAviso('Suscripción activada. El complejo vuelve a aparecer en el catálogo.');
      setActivarId(null);
      setNotas('');
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar');
    } finally {
      setProcesando(false);
    }
  };

  const suspender = async (id: number) => {
    setProcesando(true);
    setError(null);
    try {
      await api(`/admin/suscripciones/${id}/suspender`, {
        method: 'POST',
        body: JSON.stringify({ notas: notas.trim() || 'Suspendida por la plataforma (no pago / revisión)' }),
      });
      setAviso('Complejo suspendido. Ya no aparece en el catálogo público.');
      setSuspenderId(null);
      setNotas('');
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo suspender');
    } finally {
      setProcesando(false);
    }
  };

  const items = data?.items ?? [];
  const resumen = data?.resumen;

  return (
    <main className="contenedor" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
      {/* Encabezado */}
      <div className="fila-entre" style={{ marginBottom: '0.9rem' }}>
        <div>
          <h1 className="titulo" style={{ margin: 0 }}>Plataforma</h1>
          <p className="subtitulo" style={{ margin: '0.2rem 0 0' }}>
            Complejos suscriptos a PlayControl — el cobro es manual; acá se confirma.
          </p>
        </div>
        <Building2 size={32} strokeWidth={1.6} style={{ color: 'var(--primario)' }} aria-hidden />
      </div>

      {error && <div className="alerta-error" role="alert">{error}</div>}
      {aviso && (
        <div className="alerta-error" role="status" style={{ background: 'var(--primario-soft)', color: 'var(--primario-2)', borderColor: 'color-mix(in srgb, var(--primario) 35%, transparent)' }}>
          <CircleCheck size={15} style={{ verticalAlign: '-2px', marginRight: '0.4rem' }} />{aviso}
        </div>
      )}

      {/* Resumen */}
      {resumen && (
        <div className="metricas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: '1rem' }}>
          <div className="metrica" style={{ padding: '0.7rem 0.9rem' }}>
            <div className="metrica-label"><Building2 size={13} style={{ verticalAlign: '-2px' }} /> Complejos</div>
            <div className="metrica-valor" style={{ fontSize: '1.5rem' }}>{resumen.total}</div>
          </div>
          <div className="metrica" style={{ padding: '0.7rem 0.9rem' }}>
            <div className="metrica-label"><CircleCheck size={13} style={{ verticalAlign: '-2px' }} /> Activos</div>
            <div className="metrica-valor" style={{ fontSize: '1.5rem' }}>{resumen.en_activa}</div>
            <div className="texto-debil" style={{ fontSize: '0.75rem' }}>{resumen.en_prueba} en trial</div>
          </div>
          <div className="metrica" style={{ padding: '0.7rem 0.9rem' }}>
            <div className="metrica-label"><Ban size={13} style={{ verticalAlign: '-2px' }} /> Suspendidos</div>
            <div className="metrica-valor" style={{ fontSize: '1.5rem' }}>{resumen.suspendidos}</div>
          </div>
          <div className="metrica" style={{ padding: '0.7rem 0.9rem' }}>
            <div className="metrica-label"><BadgeDollarSign size={13} style={{ verticalAlign: '-2px' }} /> MRR</div>
            <div className="metrica-valor" style={{ fontSize: '1.3rem' }}>{fmtPesos(resumen.mrr)}</div>
            <div className="texto-debil" style={{ fontSize: '0.75rem' }}>ingresos/mes estimados</div>
          </div>
        </div>
      )}

      {/* Listado */}
      {cargando ? (
        <p className="texto-sec">Cargando complejos…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Complejo</th>
                <th>Dueño</th>
                <th>Estado</th>
                <th>Vigencia</th>
                <th>Monto</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ complejo: c, suscripcion: s, vigente, duenos }) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nombre}</strong>
                    <div className="texto-debil" style={{ fontSize: '0.78rem' }}>
                      {c.ciudad ?? 'Sin ciudad'} · /{c.slug} · {c.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo'}
                      {!c.activo && <span style={{ color: 'var(--peligro)' }}> · INACTIVO</span>}
                    </div>
                    {c.telefono && <div className="texto-debil" style={{ fontSize: '0.78rem' }}>{c.telefono}{c.email_contacto ? ` · ${c.email_contacto}` : ''}</div>}
                  </td>
                  <td>
                    {duenos.length > 0 ? duenos.join(', ') : <span className="texto-debil">—</span>}
                  </td>
                  <td><BadgeEstado sub={s} vigente={vigente} /></td>
                  <td className="texto-sec" style={{ fontSize: '0.83rem' }}>
                    {s ? (s.fin ? `hasta ${s.fin}` : 'sin vencimiento') : '—'}
                    {s?.metodo_pago && s.estado === 'activa' && <div className="texto-debil" style={{ fontSize: '0.75rem' }}>{METODO(s.metodo_pago)}</div>}
                  </td>
                  <td>{s ? fmtPesos(Number(s.monto) || 0) : '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {activarId !== c.id && suspenderId !== c.id && (
                      <>
                        <button type="button" className="boton boton-outline" style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', marginRight: '0.35rem' }} onClick={() => { setActivarId(c.id); setSuspenderId(null); setAviso(null); }}>
                          {vigente ? 'Renovar' : 'Activar'}
                        </button>
                        <button type="button" className="boton boton-ghost" style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', color: 'var(--peligro)' }} onClick={() => { setSuspenderId(c.id); setActivarId(null); setAviso(null); }}>
                          Suspender
                        </button>
                      </>
                    )}
                    {activarId === c.id && (
                      <div className="stack" style={{ gap: '0.4rem', textAlign: 'left', minWidth: '17rem', padding: '0.35rem 0' }}>
                        <div className="fila" style={{ gap: '0.35rem' }}>
                          <select className="input" style={{ width: '4.5rem', padding: '0.3rem' }} value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Meses">
                            {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} mes{m > 1 ? 'es' : ''}</option>)}
                          </select>
                          <select className="input" style={{ padding: '0.3rem' }} value={metodo} onChange={(e) => setMetodo(e.target.value as typeof metodo)} aria-label="Método de pago">
                            <option value="transferencia">Transferencia</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="otro">Otro</option>
                          </select>
                          <input className="input" style={{ width: '6.2rem', padding: '0.3rem' }} type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} aria-label="Monto" />
                        </div>
                        <input className="input" style={{ padding: '0.3rem' }} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Nota (opcional): pago verificado por WhatsApp…" />
                        <div className="fila" style={{ gap: '0.35rem' }}>
                          <button type="button" className="boton boton-primario" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }} disabled={procesando} onClick={() => void activar(c.id)}>
                            Confirmar pago
                          </button>
                          <button type="button" className="boton boton-ghost" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} disabled={procesando} onClick={() => setActivarId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    {suspenderId === c.id && (
                      <div className="stack" style={{ gap: '0.4rem', textAlign: 'left', minWidth: '15rem', padding: '0.35rem 0' }}>
                        <p className="texto-sec" style={{ fontSize: '0.82rem', margin: 0 }}>
                          {c.nombre} deja de aparecer en el catálogo y no puede vender.
                        </p>
                        <input className="input" style={{ padding: '0.3rem' }} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Motivo de la suspensión…" />
                        <div className="fila" style={{ gap: '0.35rem' }}>
                          <button type="button" className="boton boton-primario" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', background: 'var(--peligro)', borderColor: 'var(--peligro)' }} disabled={procesando} onClick={() => void suspender(c.id)}>
                            Sí, suspender
                          </button>
                          <button type="button" className="boton boton-ghost" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} disabled={procesando} onClick={() => setSuspenderId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="texto-sec" style={{ padding: '1rem', textAlign: 'center' }}>Todavía no hay complejos registrados.</p>}
        </div>
      )}

      <p className="texto-debil" style={{ marginTop: '1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Users size={13} /> El dueño recibe una notificación in-app cuando se activa o suspende su suscripción.
        <Wallet size={13} style={{ marginLeft: '0.5rem' }} /> El cobro es manual (transferencia o efectivo).
        <Trophy size={13} style={{ marginLeft: '0.5rem' }} /> Complejo #1 es cortesía fundador (sin vencimiento).
      </p>
    </main>
  );
}
