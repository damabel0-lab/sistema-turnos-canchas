import { useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';

interface PasoProps {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}

function Paso({ titulo, subtitulo, children }: PasoProps) {
  return (
    <Card>
      <h2 className="titulo" style={{ fontSize: '1.25rem' }}>{titulo}</h2>
      <p className="texto-sec" style={{ marginBottom: '1rem' }}>{subtitulo}</p>
      {children}
    </Card>
  );
}

export function ConfigurarPage() {
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<'fraccionado' | 'complejo_deportivo'>('fraccionado');
  const [nombre, setNombre] = useState('');
  const [horaApertura, setHoraApertura] = useState('08');
  const [horaCierre, setHoraCierre] = useState('23');
  const [cancelacionHoras, setCancelacionHoras] = useState('2');
  const [descuentoTurnoFijo, setDescuentoTurnoFijo] = useState('10');
  const [gym, setGym] = useState(false);
  const [pileta, setPileta] = useState(false);
  const [socios, setSocios] = useState(false);

  async function guardarYIrAlDashboard() {
    setGuardando(true);
    setError(null);
    try {
      await api('/admin/setup', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          nombre,
          hora_apertura: Number(horaApertura),
          hora_cierre: Number(horaCierre),
          politica_cancelacion_horas: Number(cancelacionHoras),
          descuento_turno_fijo_porcentaje: Number(descuentoTurnoFijo),
          gym,
          pileta,
          socios,
        }),
      });
      setMensaje('Complejo configurado ✅');
      window.location.href = '/admin/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setGuardando(false);
    }
  }

  const pasos = [
    // Paso 0 — Bienvenida y tipo
    {
      titulo: '¡Bienvenido a PlayControl!',
      subtitulo: 'Vamos a configurar tu espacio deportivo en pocos minutos.',
      contenido: (
        <div className="stack">
          <p className="texto-sec">Elegí el tipo de espacio que querés administrar:</p>
          <div className="fila">
            <button
              type="button"
              onClick={() => setTipo('fraccionado')}
              className="boton"
              style={{
                background: tipo === 'fraccionado' ? '#4f46e5' : '#f3f4f6',
                color: tipo === 'fraccionado' ? '#fff' : '#374151',
              }}
            >
              Cancha individual / Fraccionado
            </button>
            <button
              type="button"
              onClick={() => setTipo('complejo_deportivo')}
              className="boton"
              style={{
                background: tipo === 'complejo_deportivo' ? '#4f46e5' : '#f3f4f6',
                color: tipo === 'complejo_deportivo' ? '#fff' : '#374151',
              }}
            >
              Complejo deportivo
            </button>
          </div>
        </div>
      ),
    },
    // Paso 1 — Datos del complejo
    {
      titulo: 'Datos del complejo',
      subtitulo: 'Nombre y horarios de atención.',
      contenido: (
        <div className="stack">
          <label className="label">
            Nombre comercial
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" required />
          </label>
          <label className="label">
            Horario de apertura
            <input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} className="input" />
          </label>
          <label className="label">
            Horario de cierre
            <input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} className="input" />
          </label>
        </div>
      ),
    },
    // Paso 2 — Políticas
    {
      titulo: 'Políticas del complejo',
      subtitulo: 'Cancelaciones y descuentos.',
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
      titulo: 'Amenidades',
      subtitulo: '¿Qué instalaciones incluye el complejo?',
      contenido: (
        <div className="stack">
          <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={gym} onChange={(e) => setGym(e.target.checked)} />
            Gimnasio activo
          </label>
          <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={pileta} onChange={(e) => setPileta(e.target.checked)} />
            Pileta activa
          </label>
        </div>
      ),
    },
    // Paso 4 — Socios
    {
      titulo: 'Socios y beneficios',
      subtitulo: '¿Querés ofrecer socios con beneficios?',
      contenido: (
        <div className="stack">
          <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={socios} onChange={(e) => setSocios(e.target.checked)} />
            Ofreceré socios con descuentos
          </label>
          <p className="texto-sec" style={{ fontSize: '0.85rem' }}>
            Si marcás esta opción, podrás configurar descuentos y beneficios para socios desde el panel admin.
          </p>
        </div>
      ),
    },
    // Paso 5 — Resumen
    {
      titulo: 'Resumen y publicar',
      subtitulo: 'Revisá la configuración antes de arrancar.',
      contenido: (
        <div className="stack">
          <p className="texto-sec">Nombre: {nombre || 'Sin nombre'}</p>
          <p className="texto-sec">Tipo: {tipo === 'fraccionado' ? 'Cancha individual' : 'Complejo deportivo'}</p>
          <p className="texto-sec">Horario: {String(horaApertura).padStart(2, '0')} → {String(horaCierre).padStart(2, '0')} hs</p>
          <p className="texto-sec">Cancelación mínima: {cancelacionHoras} hs antes</p>
          <p className="texto-sec">Descuento turno fijo: {descuentoTurnoFijo}%</p>
          <p className="texto-sec">Gimnasio: {gym ? 'Sí' : 'No'}</p>
          <p className="texto-sec">Pileta: {pileta ? 'Sí' : 'No'}</p>
          <p className="texto-sec">Socios: {socios ? 'Sí' : 'No'}</p>
          {error && <p style={{ color: '#dc2626' }}>{error}</p>}
          <button
            type="button"
            className="boton boton-primario"
            onClick={guardarYIrAlDashboard}
            disabled={guardando || !nombre.trim()}
          >
            {guardando ? 'Guardando…' : 'Finalizar configuración'}
          </button>
        </div>
      ),
    },
  ];

  const pasoActual = pasos[paso];

  return (
    <main className="pantalla">
      <div className="contenedor-estrecho">
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="texto-sec">Paso {paso + 1} de {pasos.length}</span>
          <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '9999px', marginTop: '0.25rem' }}>
            <div
              style={{
                height: '100%',
                width: `${((paso + 1) / pasos.length) * 100}%`,
                background: '#4f46e5',
                borderRadius: '9999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <Paso titulo={pasoActual.titulo} subtitulo={pasoActual.subtitulo}>
          {pasoActual.contenido}
        </Paso>

        <div className="fila-entre" style={{ marginTop: '1rem' }}>
          {paso > 0 && (
            <button className="boton boton-outline" onClick={() => setPaso((p) => Math.max(0, p - 1))}>
              Atrás
            </button>
          )}
          {paso < pasos.length - 1 && (
            <button className="boton boton-primario" onClick={() => setPaso((p) => Math.min(pasos.length - 1, p + 1))}>
              Siguiente
            </button>
          )}
        </div>
        {mensaje && <p style={{ color: '#10b981', marginTop: '0.5rem' }}>{mensaje}</p>}
      </div>
    </main>
  );
}
