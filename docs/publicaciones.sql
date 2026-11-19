-- PlayControl — Muro social del complejo (publicaciones, fotos, reacciones y comentarios)
-- Ejecutar en el SQL Editor de Supabase. Idempotente: se puede correr varias veces.

-- ============================================================
-- 1) Fotos de perfil y portada del complejo
-- ============================================================
ALTER TABLE public.complejos ADD COLUMN IF NOT EXISTS foto_portada text;
ALTER TABLE public.complejos ADD COLUMN IF NOT EXISTS foto_perfil  text;

-- ============================================================
-- 2) Publicaciones del muro (una por complejo, autor = usuario logueado)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.publicaciones (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complejo_id   bigint NOT NULL REFERENCES public.complejos(id) ON DELETE CASCADE,
  usuario_id    uuid   NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto         text,
  eliminado     boolean NOT NULL DEFAULT false,
  creado_en     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  editado_en    timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_publicaciones_complejo
  ON public.publicaciones (complejo_id, creado_en DESC);

-- ============================================================
-- 3) Imágenes de cada publicación (hasta 4 por publicación)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.publicacion_imagenes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publicacion_id  bigint NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  url             text   NOT NULL,
  posicion        smallint NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_publicacion_imagenes_pub
  ON public.publicacion_imagenes (publicacion_id, posicion);

-- ============================================================
-- 4) Reacciones (like) — una por usuario y publicación
-- ============================================================
CREATE TABLE IF NOT EXISTS public.publicacion_reacciones (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publicacion_id  bigint NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  usuario_id      uuid   NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  creado_en       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (publicacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_publicacion_reacciones_pub
  ON public.publicacion_reacciones (publicacion_id);

-- ============================================================
-- 5) Comentarios (planos, orden cronológico)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.publicacion_comentarios (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publicacion_id  bigint NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  usuario_id      uuid   NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto           text   NOT NULL,
  eliminado       boolean NOT NULL DEFAULT false,
  creado_en       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_publicacion_comentarios_pub
  ON public.publicacion_comentarios (publicacion_id, creado_en);

-- ============================================================
-- 6) RLS mínimo (la lógica fina la hace el backend con service role)
-- ============================================================
ALTER TABLE public.publicaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_imagenes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_reacciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS publicaciones_select ON public.publicaciones;
CREATE POLICY publicaciones_select ON public.publicaciones
  FOR SELECT USING (true);

DROP POLICY IF EXISTS publicacion_imagenes_select ON public.publicacion_imagenes;
CREATE POLICY publicacion_imagenes_select ON public.publicacion_imagenes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS publicacion_reacciones_select ON public.publicacion_reacciones;
CREATE POLICY publicacion_reacciones_select ON public.publicacion_reacciones
  FOR SELECT USING (true);

DROP POLICY IF EXISTS publicacion_comentarios_select ON public.publicacion_comentarios;
CREATE POLICY publicacion_comentarios_select ON public.publicacion_comentarios
  FOR SELECT USING (true);

-- ============================================================
-- 7) Bucket de Storage para fotos de publicaciones y del perfil
--    Lectura pública (URLs /storage/v1/object/public/...); escritura solo
--    desde el backend con service role.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'publicaciones',
  'publicaciones',
  true,
  8388608,  -- 8 MB
  ARRAY['image/png','image/jpeg','image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
