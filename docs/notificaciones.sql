-- Notificaciones del sistema (recordatorios, suspensiones, avisos del complejo)
-- Ejecutar en el SQL Editor de Supabase si la tabla no existe todavía.
-- Idempotente: se puede correr varias veces sin romper nada.

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo character varying NOT NULL DEFAULT 'info',
  titulo character varying NOT NULL,
  cuerpo text NOT NULL,
  leida boolean NOT NULL DEFAULT false,
  creada_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
  ON public.notificaciones (usuario_id, creada_en DESC);
