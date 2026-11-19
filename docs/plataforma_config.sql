-- ============================================================
-- PlayControl — Configuración global de plataforma (single-row)
-- Correr en SQL Editor de Supabase (una sola vez).
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.configuracion_plataforma (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Plan y precio
  precio_plan_mensual numeric NOT NULL DEFAULT 50000,
  trial_dias integer NOT NULL DEFAULT 14,
  registro_habilitado boolean NOT NULL DEFAULT true,
  -- Contacto
  nombre_plataforma varchar(120) NOT NULL DEFAULT 'PlayControl',
  email_soporte varchar(120) NOT NULL DEFAULT 'soporte@playcontrol.tech',
  telefono_soporte varchar(40),
  -- Operativa de email (modo simulado por defecto; real si se configura SMTP)
  emails_reales boolean NOT NULL DEFAULT false,
  smtp_host varchar(120),
  smtp_puerto integer,
  smtp_usuario varchar(120),
  smtp_password varchar(120),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Siembra inicial (un solo registro o nada si ya existe)
INSERT INTO public.configuracion_plataforma
  (precio_plan_mensual, trial_dias, nombre_plataforma, email_soporte, telefono_soporte)
VALUES
  (50000, 14, 'PlayControl', 'soporte@playcontrol.tech', NULL)
ON CONFLICT DO NOTHING;

-- Sin RLS (app usa service_role para todo su manejo)
ALTER TABLE public.configuracion_plataforma ENABLE ROW LEVEL SECURITY;

COMMIT;
-- Verificación
SELECT * FROM public.configuracion_plataforma;
