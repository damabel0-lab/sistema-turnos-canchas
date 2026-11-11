import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface OpcionSelect {
  valor: string;
  label: string;
}

export interface GrupoSelect {
  label: string;
  opciones: OpcionSelect[];
}

interface SelectOpcionesProps {
  valor: string;
  onChange: (v: string) => void;
  grupos: GrupoSelect[];
  placeholder?: string;
  ariaLabel?: string;
}

/** Dropdown propio: lista agrupada, scroll interno (~4-5 opciones) y check visual.
 *  Reemplaza al <select> nativo para acotar la altura y mostrar grupos por deporte. */
export function SelectOpciones({ valor, onChange, grupos, placeholder = 'Elegir…', ariaLabel }: SelectOpcionesProps) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const planas = grupos.flatMap((g) => g.opciones);
  const elegida = planas.find((o) => o.valor === valor);

  useEffect(() => {
    if (!abierto) return undefined;
    const idx = planas.findIndex((o) => o.valor === valor);
    setActivo(idx >= 0 ? idx : 0);
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function onKey(e: KeyboardEvent<HTMLButtonElement> | KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      setAbierto(false);
      return;
    }
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setAbierto(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((a) => Math.min(a + 1, planas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const op = planas[activo];
      if (op) {
        onChange(op.valor);
        setAbierto(false);
      }
    }
  }

  return (
    <div className="select-opciones" ref={ref}>
      <button
        type="button"
        className={`select-opciones-boton${abierto ? ' abierto' : ''}${elegida ? ' con-valor' : ''}`}
        onClick={() => setAbierto((o) => !o)}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={ariaLabel ?? placeholder}
      >
        <span className="select-opciones-texto">{elegida ? elegida.label : placeholder}</span>
        <ChevronDown size={14} className={`select-opciones-flecha${abierto ? ' rotada' : ''}`} />
      </button>

      {abierto && (
        <div className="select-opciones-panel" role="listbox" aria-label={ariaLabel ?? placeholder} onKeyDown={onKey} tabIndex={-1}>
          {planas.length === 0 ? (
            <div className="select-opciones-vacio">Sin opciones</div>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.label} className="select-opciones-grupo">
                <div className="select-opciones-grupo-titulo">{grupo.label}</div>
                {grupo.opciones.map((o) => {
                  const idx = planas.findIndex((p) => p.valor === o.valor);
                  const seleccionada = o.valor === valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      role="option"
                      aria-selected={seleccionada}
                      className={`select-opciones-opcion${seleccionada ? ' seleccionada' : ''}${idx === activo ? ' activa' : ''}`}
                      onMouseEnter={() => setActivo(idx)}
                      onClick={() => {
                        onChange(o.valor);
                        setAbierto(false);
                      }}
                    >
                      <span>{o.label}</span>
                      {seleccionada && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
