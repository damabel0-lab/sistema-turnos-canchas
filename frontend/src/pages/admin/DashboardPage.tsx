import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { CalendarDays, BadgeDollarSign, UserCheck, AlertTriangle } from 'lucide-react';

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

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<ResumenDashboard>('/dashboard/resumen'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando dashboard');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <main className="pantalla">
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo">Dashboard</h1>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            Actualizar
          </button>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        {datos && (
          <div className="grilla-tarjetas">
            <Card>
              <div className="icono-circulo" style={{ marginBottom: '0.5rem' }}>
                <CalendarDays size={24} />
              </div>
              <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Reservas hoy</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{datos.reservas_hoy}</div>
            </Card>

            <Card>
              <div className="icono-circulo" style={{ marginBottom: '0.5rem' }}>
                <UserCheck size={24} />
              </div>
              <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Confirmadas</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{datos.confirmadas}</div>
            </Card>

            <Card>
              <div className="icono-circulo" style={{ marginBottom: '0.5rem' }}>
                <BadgeDollarSign size={24} />
              </div>
              <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Ingresos hoy</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${datos.ingresos_dia}</div>
            </Card>

            <Card>
              <div className="icono-circulo" style={{ marginBottom: '0.5rem' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Abonos por vencer</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{datos.abonos_por_vencer}</div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
