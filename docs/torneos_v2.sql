-- PlayControl — Migración de torneos (Fase 2 / MVP real)
-- Ejecutar en el SQL Editor de Supabase UNA SOLA VEZ.
-- Idempotente: "IF NOT EXISTS" / "IF EXISTS" en cada paso.
-- Ejecutar este archivo ANTES de usar la app con soporte torneos Fase 2.

-- 1) Ampliar torneos con todos los campos del producto
ALTER TABLE public.torneos
  ADD COLUMN IF NOT EXISTS modalidad character varying NOT NULL DEFAULT 'equipos'
    CHECK (modalidad IN ('individual','equipos')),
  ADD COLUMN IF NOT EXISTS formato character varying NOT NULL DEFAULT 'todos_contra_todos'
    CHECK (formato IN ('todos_contra_todos','eliminacion_directa')),
  ADD COLUMN IF NOT EXISTS jugadores_por_equipo integer,
  ADD COLUMN IF NOT EXISTS cupo_equipos integer,                            -- NULL = sin límite
  ADD COLUMN IF NOT EXISTS cuota_inscripcion numeric,                      -- NULL = gratis
  ADD COLUMN IF NOT EXISTS reglamento text,
  ADD COLUMN IF NOT EXISTS cancha_id integer REFERENCES public.canchas(id),
  ADD COLUMN IF NOT EXISTS estado character varying NOT NULL DEFAULT 'inscripcion'
    CHECK (estado IN ('inscripcion','en_curso','finalizado','cancelado'));

-- 2) Permitir partidos sin fecha aún (fixture se pega después)
ALTER TABLE public.partidos_torneo ALTER COLUMN fecha_hora DROP NOT NULL;

-- 3) Tabla de inscripciones para torneos individuales
CREATE TABLE IF NOT EXISTS public.inscripciones_torneo (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  torneo_id integer NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (torneo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_torneo ON public.inscripciones_torneo (torneo_id);
