import { useState } from 'react';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
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

interface CanchaNueva {
  nombre: string;
  deporte_id: string;
  precio_base: string;
  activa: boolean;
  caracteristicas: string;
}

export function ConfigurarPage() {
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const { toasts, mostrar, cerrar } = useToast();
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

  // Canchas nuevas
  const [cantidadCanchas, setCantidadCanchas] = useState('1');
  const [canchasNuevas, setCanchasNuevas] = useState<CanchaNueva[]>([
    { nombre: '', deporte_id: '', precio_base: '', activa: true, caracteristicas: '' },
  ]);

  async function guardarTodo() {
    setGuardando(true);
    setError(null);

    // 1. Guardar metadatos del complejo
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar configuración');
      setGuardando(false);
      return;
    }

    // 2. Crear cada cancha
    for (const cancha of canchasNuevas) {
      if (!cancha.nombre.trim() || !cancha.deporte_id || !cancha.precio_base) {
        continue; // saltar canchas vacías
      }
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

    mostrar('Complejo configurado ', 'success');
    window.location.href = '/admin/dashboard';
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
                background: tipo === 'fraccionado' ? 'var(--primario)' : 'var(--bg-surface-2)',
                color: tipo === 'fraccionado' ? '#fff' : 'var(--texto)',
              }}
            >
              Cancha individual / Fraccionado
            </button>
            <button
              type="button"
              onClick={() => setTipo('complejo_deportivo')}
              className="boton"
              style={{
                background: tipo === 'complejo_deportivo' ? 'var(--primario)' : 'var(--bg-surface-2)',
                color: tipo === 'complejo_deportivo' ? '#fff' : 'var(--texto)',
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
    // Paso 5 — ¿Cuántas canchas?
    {
      titulo: '¿Cuántas canchas/sectores tiene?',
      subtitulo: 'Indicá la cantidad total de espacios que administra tu complejo/cancha.',
      contenido: (
        <div className="stack">
          <label className="label">
            Cantidad de canchas
            <input
              type="number"
              min={1}
              max={20}
              value={cantidadCanchas}
              onChange={(e) => {
                const n = Number(e.target.value);
                setCantidadCanchas(e.target.value);
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
          <p className="texto-sec" style={{ fontSize: '0.85rem' }}>
            Podés cargar los datos de cada cancha en el próximo paso.
          </p>
        </div>
      ),
    },
    // Paso 6 — Datos de cada cancha
    {
      titulo: 'Datos de las canchas',
      subtitulo: 'Para cada cancha, completá los datos principales.',
      contenido: (
        <div className="stack">
          {canchasNuevas.map((cancha, i) => (
            <div key={i} className="tarjeta-plana" style={{ padding: '0.75rem' }}>
              <h4 style={{ marginTop: 0 }}>Cancha {i + 1}</h4>
              <label className="label">
                Nombre
                <input
                  value={cancha.nombre}
                  onChange={(e) =>
                    setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, nombre: e.target.value } : c)))
                  }
                  className="input"
                />
              </label>
              <label className="label">
                Deporte
                <select
                  value={cancha.deporte_id}
                  onChange={(e) =>
                    setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, deporte_id: e.target.value } : c)))
                  }
                  className="input"
                >
                  <option value="">Elegir…</option>
                  <option value="1">Fútbol Sintético 5</option>
                  <option value="2">Fútbol Sintético 7</option>
                  <option value="4">Pádel</option>
                  <option value="5">Tenis</option>
                  <option value="6">Básquet</option>
                </select>
              </label>
              <label className="label">
                Precio por hora ($)
                <input
                  type="number"
                  min={0}
                  value={cancha.precio_base}
                  onChange={(e) =>
                    setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, precio_base: e.target.value } : c)))
                  }
                  className="input"
                />
              </label>
              <label className="label">
                Características
                <input
                  value={cancha.caracteristicas}
                  placeholder="Ej: Iluminada, techada…"
                  onChange={(e) =>
                    setCanchasNuevas((prev) => prev.map((c, j) => (j === i ? { ...c, caracteristicas: e.target.value } : c)))
                  }
                  className="input"
                />
              </label>
            </div>
          ))}
        </div>
      ),
    },
    // Paso 7 — Resumen y publicar
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
          <p className="texto-sec">Canchas: {canchasNuevas.filter((c) => c.nombre.trim()).length} cargadas</p>
          {error && <p style={{ color: 'var(--peligro)' }}>{error}</p>}
          <button
            type="button"
            className="boton boton-primario"
            onClick={guardarTodo}
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
          <div style={{ height: '6px', background: 'var(--border)', borderRadius: '9999px', marginTop: '0.25rem' }}>
            <div
              style={{
                height: '100%',
                width: `${((paso + 1) / pasos.length) * 100}%`,
                background: 'var(--primario)',
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
        <ToastContainer toasts={toasts} onCerrar={cerrar} />
      </div>
    </main>
  );
}
