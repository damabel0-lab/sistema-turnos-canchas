import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Badge } from '../../components/ui';
import { CreditCard, RefreshCw } from 'lucide-react';

interface Abono {
  id: number;
  disciplina_id: number | null;
  clases_totales: number;
  clases_disponibles: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_pagado: number;
  activo: boolean;
}

const nombresDisciplina: Record<number, string> = {
  9: 'Gimnasio',
  10: 'Pileta',
};

export function MisAbonosPage() {
  const { session } = useAuth();
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!session) return;
    try {
      setAbonos(await api<Abono[]>('/abonos/mis'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando abonos');
    }
  }, [session]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const vencido = (f: string) => new Date(f) < new Date();

  if (!session) {
    return (
      <main className="pantalla">
        <div className="contenedor">
          <Card className="caja-vacia">
            <h1 className="titulo">Mis Abonos</h1>
            <p className="texto-sec">Iniciá sesión para ver tus abonos.</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo">Mis Abonos / Pases</h1>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
        {error && <p style={{ color: 'var(--peligro)' }}>{error}</p>}

        {abonos.length === 0 ? (
          <Card className="caja-vacia">
            <div className="icono-circulo" style={{ margin: '0 auto 0.75rem' }}>
              <CreditCard size={28} />
            </div>
            <h3 style={{ margin: '0 0 0.25rem' }}>No tenés abonos activos</h3>
            <p className="texto-sec">Comprá un abono de gimnasio o pileta en el complejo.</p>
          </Card>
        ) : (
          <div className="grilla-tarjetas">
            {abonos.map((a) => {
              const v = vencido(a.fecha_vencimiento);
              const estado = !a.activo || v ? 'Vencido' : a.clases_disponibles > 0 ? 'Activo' : 'Sin clases';
              const variante = estado === 'Activo' ? 'success' : estado === 'Sin clases' ? 'warning' : 'danger';
              return (
                <Card key={a.id}>
                  <div className="fila-entre" style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{nombresDisciplina[a.disciplina_id ?? 0] ?? '—'}</div>
                      <div className="texto-sec" style={{ fontSize: '0.8rem' }}>
                        Vence: {a.fecha_vencimiento}
                      </div>
                    </div>
                    <Badge variant={variante}>{estado}</Badge>
                  </div>
                  <div className="fila" style={{ gap: '1.5rem', marginTop: '0.5rem' }}>
                    <div>
                      <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Clases totales</div>
                      <div style={{ fontWeight: 700 }}>{a.clases_totales}</div>
                    </div>
                    <div>
                      <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Disponibles</div>
                      <div style={{ fontWeight: 700 }}>{a.clases_disponibles}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
