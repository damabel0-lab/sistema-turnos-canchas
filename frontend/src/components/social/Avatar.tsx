import type { CSSProperties } from 'react';

const PALETA = ['#0f766e', '#1d4ed8', '#7c3aed', '#b45309', '#be123c', '#047857', '#0369a1', '#a21caf'];

/** Iniciales del nombre (máx 2 letras) */
export function iniciales(nombre: string, apellido: string): string {
  const a = (nombre ?? '').trim();
  const b = (apellido ?? '').trim();
  const primera = a.charAt(0) || b.charAt(0) || '?';
  const segunda = a.length > 0 && b.length > 0 ? b.charAt(0) : a.charAt(1) || '';
  return (primera + segunda).toUpperCase();
}

/** Color de fondo determinístico por id de usuario */
export function colorAvatar(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

export interface AvatarProps {
  nombre: string;
  apellido: string;
  /** id del usuario para el color de fondo (opcional) */
  id?: string;
  url?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Avatar circular: foto si tiene, si no iniciales sobre color */
export function Avatar({ nombre, apellido, id, url, size = 40, className, style }: AvatarProps) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '9999px',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: id ? colorAvatar(id) : 'var(--primario)',
    color: '#fff',
    fontWeight: 800,
    fontSize: Math.max(11, Math.round(size * 0.38)),
    letterSpacing: '-0.02em',
    userSelect: 'none',
    ...style,
  };
  if (url) {
    return (
      <img
        src={url}
        alt={`${nombre} ${apellido}`.trim()}
        className={className}
        style={{ ...base, objectFit: 'cover' }}
      />
    );
  }
  return (
    <span className={className} style={base} aria-hidden>
      {iniciales(nombre, apellido)}
    </span>
  );
}

/** "hace 5 min" / "hace 2 h" / "ayer" / "12 nov" */
export function haceCuanto(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

/** Lee un File como dataURL (base64) para mandarlo al backend */
export function leerImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer la imagen'));
    r.readAsDataURL(file);
  });
}
