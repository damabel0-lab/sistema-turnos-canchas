import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  titulo: string;
  descripcion?: string;
  confirmarTexto: string;
  cancelarTexto?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  peligro?: boolean;
}

export function ConfirmDialog({
  open,
  titulo,
  descripcion,
  confirmarTexto,
  cancelarTexto = 'Cancelar',
  onConfirmar,
  onCancelar,
  peligro = true,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="dialog-backdrop"
      onClick={onCancelar}
    >
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-titulo">{titulo}</h3>
          <button type="button" className="dialog-cerrar" onClick={onCancelar} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
        {descripcion && <p className="dialog-descripcion">{descripcion}</p>}
        <div className="dialog-acciones">
          <button type="button" className="boton boton-secondary" onClick={onCancelar}>
            {cancelarTexto}
          </button>
          <button
            type="button"
            className={peligro ? 'boton boton-danger' : 'boton boton-primario'}
            onClick={onConfirmar}
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
