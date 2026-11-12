import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

export interface ComplejoResumen {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  ciudad: string | null;
  direccion: string | null;
  gym: boolean;
  pileta: boolean;
  precio_mensual_gym: number | null;
  precio_mensual_pileta: number | null;
  ofrece_torneos: boolean;
  ofrece_socios: boolean;
  amenidades: string[];
}

export interface SuscripcionInfo {
  id: number;
  estado: 'prueba' | 'activa' | 'vencida' | 'cancelada';
  monto: number;
  inicio: string;
  fin: string | null;
  metodo_pago: string | null;
}

export interface MembresiaInfo {
  complejo_id: number;
  rol: 'dueno' | 'recepcionista';
  complejo: ComplejoResumen | null;
  suscripcion: SuscripcionInfo | null;
  vigente: boolean;
}

/** Clave con la que el frontend persiste el complejo activo (staff en operaciones / jugador reservando) */
export const CLAVE_COMPLEJO_ACTIVO = 'playcontrol.complejo_id';
export const CLAVE_COMPLEJO_SLUG = 'playcontrol.complejo_slug';

interface ComplejoContextValue {
  /** Membresías del usuario logueado (dueño/recepcionista en complejos) */
  membresias: MembresiaInfo[];
  cargando: boolean;
  /** Complejo activo (si hay uno persistido y es válido, o única membresía). null = nada elegido/vínculo */
  activoId: number | null;
  /** Membresía del complejo activo (null si el activo es público y el usuario no es staff ahí) */
  membresiaActiva: MembresiaInfo | null;
  rolEnActivo: 'dueno' | 'recepcionista' | null;
  esDuenoActivo: boolean;
  esStaffActivo: boolean;
  esSuperAdmin: boolean;
  /** ¿Complejo activo opera con suscripción vigente? null si no es un complejo propio del staff */
  vigenteActivo: boolean | null;
  /** slug del complejo activo (si se persistió) */
  activoSlug: string | null;
  /** Selecciona el complejo activo (persiste en localStorage). null = limpiar */
  seleccionar: (complejoId: number | null, slug?: string) => void;
  recargar: () => Promise<void>;
}

const ComplejoContext = createContext<ComplejoContextValue | null>(null);

function idDesdeStorage(): number | null {
  try {
    const v = Number(window.localStorage.getItem(CLAVE_COMPLEJO_ACTIVO));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function slugDesdeStorage(): string | null {
  try {
    const v = window.localStorage.getItem(CLAVE_COMPLEJO_SLUG);
    return v && /^[a-z0-9-]+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

function complejoDesdePerfil(perfil: { rol: string } | null, membresias: MembresiaInfo[], preferido: number | null): number | null {
  if (preferido != null) {
    // El storage es contexto de STAFF (o soporte plataforma super_admin).
    // Para jugadores no debe congelarse la selección entre visitas.
    if (membresias.some((m) => m.complejo_id === preferido) || perfil?.rol === 'super_admin') {
      return preferido;
    }
    return null;
  }
  if (perfil?.rol === 'super_admin' && membresias.length === 0) return null; // super admin plataforma
  return membresias[0]?.complejo_id ?? null;
}

export function ComplejoProvider({ children }: { children: ReactNode }) {
  const { session, perfil } = useAuth();
  const [membresias, setMembresias] = useState<MembresiaInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activoId, setActivoId] = useState<number | null>(() => idDesdeStorage());
  const [activoSlug, setActivoSlug] = useState<string | null>(() => slugDesdeStorage());

  const recargar = useCallback(async () => {
    if (!session) {
      setMembresias([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const data = await api<MembresiaInfo[]>('/complejos/mi');
      setMembresias(Array.isArray(data) ? data : []);
    } catch {
      setMembresias([]);
    } finally {
      setCargando(false);
    }
  }, [session]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  // Resolver el complejo activo: persistido > única membresía > primero
  useEffect(() => {
    const preferido = idDesdeStorage();
    const resuelto = complejoDesdePerfil(perfil, membresias, preferido);
    if (resuelto !== activoId) setActivoId(resuelto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membresias, perfil]);

  const seleccionar = useCallback((complejoId: number | null, slug?: string) => {
    // Solo staff de ese complejo (o super_admin de plataforma) puede PERSISTIR el complejo activo.
    // Los jugadores seleccionan su intención para la sesión, pero no queda guardada entre visitas.
    const persistible =
      perfil?.rol === 'super_admin' ||
      (complejoId != null && membresias.some((m) => m.complejo_id === complejoId));

    try {
      if (!persistible) {
        window.localStorage.removeItem(CLAVE_COMPLEJO_ACTIVO);
        window.localStorage.removeItem(CLAVE_COMPLEJO_SLUG);
      } else if (complejoId != null) {
        window.localStorage.setItem(CLAVE_COMPLEJO_ACTIVO, String(complejoId));
        if (slug) window.localStorage.setItem(CLAVE_COMPLEJO_SLUG, slug);
      } else {
        window.localStorage.removeItem(CLAVE_COMPLEJO_ACTIVO);
        window.localStorage.removeItem(CLAVE_COMPLEJO_SLUG);
      }
    } catch {
      /* modo privado: seguimos solo en memoria */
    }
    setActivoId(complejoId);
    if (complejoId == null) setActivoSlug(null);
    else if (slug) setActivoSlug(slug);
  }, [perfil?.rol, membresias]);

  const membresiaActiva = membresias.find((m) => m.complejo_id === activoId) ?? null;
  const rolEnActivo = membresiaActiva?.rol ?? null;
  const esSuperAdmin = perfil?.rol === 'super_admin';
  const esDuenoActivo = esSuperAdmin || rolEnActivo === 'dueno';
  const esStaffActivo = esSuperAdmin || rolEnActivo != null;
  const vigenteActivo = membresiaActiva ? membresiaActiva.vigente : null;

  return (
    <ComplejoContext.Provider
      value={{
        membresias,
        cargando,
        activoId,
        membresiaActiva,
        rolEnActivo,
        esDuenoActivo,
        esStaffActivo,
        esSuperAdmin,
        vigenteActivo,
        activoSlug,
        seleccionar,
        recargar,
      }}
    >
      {children}
    </ComplejoContext.Provider>
  );
}

export function useComplejo() {
  const ctx = useContext(ComplejoContext);
  if (!ctx) throw new Error('useComplejo debe usarse dentro de <ComplejoProvider>');
  return ctx;
}
