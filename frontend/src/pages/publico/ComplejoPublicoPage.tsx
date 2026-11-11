import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';

interface ConfigComplejo {
  hora_apertura: number;
  hora_cierre: number;
  cancelacion_minima_horas: number;
  descuento_turno_fijo_porcentaje: number;
}

export function ComplejoPublicoPage() {
  const [config, setConfig] = useState<ConfigComplejo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ConfigComplejo>('/config')
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error cargando datos'));
  }, []);

  const formatearHora = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <main className="pantalla">
      <div className="contenedor">
        <h1 className="titulo">Nuestro complejo</h1>
        <p className="texto-sec">Información general para todos los visitantes</p>

        {error && <p style={{ color: 'var(--peligro)' }}>{error}</p>}

        {config && (
          <div className="grilla-tarjetas">
            <Card>
              <h3 className="titulo" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Horarios de atención
              </h3>
              <p className="texto-sec">
                Abrimos de {formatearHora(config.hora_apertura)} a {formatearHora(config.hora_cierre)} hs.
              </p>
            </Card>

            <Card>
              <h3 className="titulo" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Cancelaciones
              </h3>
              <p className="texto-sec">
                Los turnos pueden cancelarse hasta {config.cancelacion_minima_horas} hs antes del inicio.
              </p>
            </Card>

            {config.descuento_turno_fijo_porcentaje > 0 && (
              <Card>
                <h3 className="titulo" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                  Turno fijo
                </h3>
                <p className="texto-sec">
                  Los clientes con turno fijo obtienen un {config.descuento_turno_fijo_porcentaje}% de descuento automático.
                </p>
              </Card>
            )}
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <Card>
            <h3 className="titulo" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              ¿Cómo reservar?
            </h3>
            <ol style={{ paddingLeft: '1rem' }}>
              <li className="texto-sec">Registrá tu cuenta o iniciá sesión</li>
              <li className="texto-sec">Elegí el deporte y la cancha que quieras reservar</li>
              <li className="texto-sec">Seleccioná el horario disponible</li>
              <li className="texto-sec">Confirmá la reserva</li>
            </ol>
          </Card>
        </div>
      </div>
    </main>
  );
}
