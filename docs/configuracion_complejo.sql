-- ============================================================
-- PlayControl - Configuración del complejo (wizard de setup)
-- Correr en el SQL Editor de Supabase (una sola vez)
-- Agrega 2 tablas a lo que ya tenemos (no toca nada existente)
-- ============================================================

-- Tabla simple de sesión del setup (track de si el complejo fue configurado)
CREATE TABLE IF NOT EXISTS public.configuracion_complejo (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla genérica clave-valor para toda la configuración persistente
CREATE TABLE IF NOT EXISTS public.configuracion_valores (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria varchar NOT NULL, -- 'metadatos', 'socios', 'abonos', 'políticas', etc.
  clave varchar NOT NULL,
  valor varchar, -- siempre como texto, el backend lo parsea/serializa según corresponda
  actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (categoria, clave)
);
