/** Hoy local (no UTC) como 'YYYY-MM-DD'.
 *  `new Date().toISOString().slice(0, 10)` devuelve la fecha UTC,
 *  que en Argentina (UTC-3) ya está un día adelante desde las 21:00.
 */
export function hoyISOLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/** Fecha local (no UTC) como 'YYYY-MM-DD' desde un Date. */
export function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}
