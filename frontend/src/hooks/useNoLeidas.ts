import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

/** Cantidad de notificaciones no leídas del usuario logueado (refresca cada 30 s) */
export function useNoLeidas(): number {
  const { session } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!session) return undefined;

    let cancelado = false;

    async function cargar() {
      try {
        const datos = await api<Array<{ leida: boolean }>>('/notificaciones');
        if (!cancelado) setNoLeidas(datos.filter((n) => !n.leida).length);
      } catch {
        // no bloquear la navegación por un error de notificaciones
      }
    }

    void cargar();
    const intervalo = setInterval(cargar, 30000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [session]);

  return noLeidas;
}
