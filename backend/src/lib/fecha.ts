/** Fecha LOCAL (no UTC) como 'YYYY-MM-DD' desde un Date.
 *  `toISOString().slice(0, 10)` devuelve la fecha UTC — en Argentina (UTC-3)
 *  ya difiere un día desde las 21:00. Resolviendo con métodos locales. */
export function isoMinLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/** Hoy LOCAL como 'YYYY-MM-DD'. */
export function hoyLocal(): string {
  return isoMinLocal(new Date());
}

/** Mañana LOCAL como 'YYYY-MM-DD'. */
export function mananaLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoMinLocal(d);
}
