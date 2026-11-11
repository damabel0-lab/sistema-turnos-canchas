import { useState } from 'react';
import { X } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'danger';

interface ToastItem {
  id: number;
  mensaje: string;
  tipo: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function mostrar(mensaje: string, tipo: ToastType = 'info') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }

  function cerrar(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, mostrar, cerrar };
}

export function ToastContainer({
  toasts,
  onCerrar,
}: {
  toasts: ToastItem[];
  onCerrar: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  const estilosPorTipo: Record<ToastType, string> = {
    info: 'toast-info',
    success: 'toast-success',
    warning: 'toast-warning',
    danger: 'toast-danger',
  };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${estilosPorTipo[toast.tipo]}`} role="alert">
          <div className="toast-mensaje">{toast.mensaje}</div>
          <button type="button" className="toast-cerrar" onClick={() => onCerrar(toast.id)} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
