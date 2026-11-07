import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

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

  if (!session) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Mis Abonos</h1>
        <p>Iniciá sesión para ver tus abonos.</p>
      </main>
    );
  }

  const vencido = (f: string) => new Date(f) < new Date();

  const contenido = abonos.length === 0 ? (
    <p>No tenés abonos activos. Comprá uno en el complejo.</p>
  ) : (
    <section>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Disciplina</th>
            <th>Clases totales</th>
            <th>Disponibles</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {abonos.map((a) => {
            const v = vencido(a.fecha_vencimiento);
            const estado = !a.activo || v ? 'Vencido' : a.clases_disponibles > 0 ? 'Activo' : 'Sin clases';
            const color =
              estado === 'Activo' ? 'green' : estado === 'Sin clases' ? '#b8860b' : 'crimson';
            return (
              <tr key={a.id}>
                <td>{nombresDisciplina[a.disciplina_id ?? 0] ?? '—'}</td>
                <td>{a.clases_totales}</td>
                <td>{a.clases_disponibles}</td>
                <td>{a.fecha_vencimiento}</td>
                <td style={{ color, fontWeight: 'bold' }}>{estado}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );

  return (
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 700 }}>
      <h1>Mis Abonos / Pases</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {contenido}
    </main>
  );
}
