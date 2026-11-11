import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button } from '../../components/ui';

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

export function ConfiguracionPage() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('fraccionado');
  const [horaApertura, setHoraApertura] = useState('08');
  const [horaCierre, setHoraCierre] = useState('23');
  const [cancelacionHoras, setCancelacionHoras] = useState('2');
  const [descuentoTurnoFijo, setDescuentoTurnoFijo] = useState('10');
  const [gym, setGym] = useState(false);
  const [pileta, setPileta] = useState(false);
  const [socios, setSocios] = useState(false);

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
      setHoraApertura(String(meta.hora_apertura ?? '08'));
      setHoraCierre(String(meta.hora_cierre ?? '23'));
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

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(parcial?: Record<string, Record<string, unknown>>) {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const payload = parcial ?? {
        metadatos: {
          nombre,
          tipo,
          hora_apertura: Number(horaApertura),
          hora_cierre: Number(horaCierre),
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

        {/* Metadatos */}
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

        {/* Botones */}
        <div className="fila" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => void cargar()}>Cancelar</Button>
          <Button variant="primary" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </div>
    </main>
  );
}
