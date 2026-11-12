import { supabase } from './supabase';

/** Id del complejo activo (staff en operaciones / jugador reservando), o null si no eligió.
 *  Lo escribe el contexto useComplejo; se manda como X-Complejo-Id en cada request. */
function idComplejoActivo(): string | null {
  try {
    const v = window.localStorage.getItem('playcontrol.complejo_id');
    return v && Number.isInteger(Number(v)) ? v : null;
  } catch {
    return null;
  }
}

/** Cliente HTTP para hablar con el backend Express (proxy /api en dev).
 *  Adjunta automáticamente el JWT de Supabase y el complejo activo (X-Complejo-Id). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const complejoId = idComplejoActivo();

  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(complejoId ? { 'X-Complejo-Id': complejoId } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
