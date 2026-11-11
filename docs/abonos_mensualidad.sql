-- Abonos mensuales de gym/pileta: servicio + estado (solicitado/activo/cancelado)
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- Ejecutar UNA SOLA VEZ — después de esto el flujo de mensualidad queda habilitado.

ALTER TABLE public.abonos
  ADD COLUMN IF NOT EXISTS servicio character varying NULL CHECK (servicio IN ('gym', 'pileta')),
  ADD COLUMN IF NOT EXISTS estado character varying NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('solicitado', 'activo', 'cancelado'));

COMMENT ON COLUMN public.abonos.servicio IS 'gym | pileta — mensualidad del servicio. NULL para abonos legacy por clases.';
COMMENT ON COLUMN public.abonos.estado IS 'solicitado = cliente lo pidió desde la app, pendiente de pago/recepción. activo = vigente. cancelado = rechazado o dado de baja.';
