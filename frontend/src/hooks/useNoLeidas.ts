import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

/** Nombre del evento personalizado que dispara NotificacionesPage al cambiar el estado de una notificación. */
export const EVENTO_NOTIFICACIONES = 'playcontrol:notificaciones';

/** Dispara una actualización inmediata del badge de notificaciones (sin esperar al próximo polling). */
export function refrescarNotificaciones() {
  document.dispatchEvent(new CustomEvent(EVENTO_NOTIFICACIONES));
}

/** Cantidad de notificaciones no leídas del usuario logueado (refresca cada 30 s + al instante si se dispara el evento). */
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
    const onChange = () => void cargar();
    document.addEventListener(EVENTO_NOTIFICACIONES, onChange);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener(EVENTO_NOTIFICACIONES, onChange);
    };
  }, [session]);

  return noLeidas;
}
