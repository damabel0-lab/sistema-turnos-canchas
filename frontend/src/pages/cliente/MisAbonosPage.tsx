import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Badge } from '../../components/ui';
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
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <Card padded={false}>
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis Abonos</h1>
            <p className="text-gray-600 mb-6">Iniciá sesión para ver tus abonos.</p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mis Abonos / Pases</h1>
          <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {abonos.length === 0 ? (
          <Card padded={false}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">No tenés abonos activos</h3>
              <p className="text-gray-600 mb-4">
                Comprá un abono de gimnasio o pileta en el complejo.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {abonos.map((a) => {
              const v = vencido(a.fecha_vencimiento);
              const estado = !a.activo || v ? 'Vencido' : a.clases_disponibles > 0 ? 'Activo' : 'Sin clases';
              return (
                <Card key={a.id} padded={false}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{nombresDisciplina[a.disciplina_id ?? 0] ?? '—'}</h3>
                        <p className="text-sm text-gray-500">{a.disciplina_id ? nombresDisciplina[a.disciplina_id] : '—'}</p>
                      </div>
                      <Badge variant={estado === 'Activo' ? 'success' : estado === 'Sin clases' ? 'warning' : 'danger'} className="text-xs">
                        {estado}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Clases totales</p>
                        <p className="font-bold text-gray-900">{a.clases_totales}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Disponibles</p>
                        <p className="font-bold text-gray-900">{a.clases_disponibles}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Vencimiento</p>
                        <p className="font-bold text-gray-900 text-sm">{a.fecha_vencimiento}</p>
                      </div>
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
