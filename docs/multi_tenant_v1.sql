-- ============================================================
-- PlayControl — Migración multi-tenant (v1)
-- Correr en el SQL Editor de Supabase (UNA sola vez).
-- Convierte el sistema single-tenant en plataforma SaaS:
--   complejos + suscripciones (cobro manual) + membresías por complejo
-- Backfill: los datos actuales quedan como "Complejo #1" (cortesía fundador).
-- ============================================================

BEGIN;

-- Guardia anti doble corrida
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'complejos') THEN
    RAISE EXCEPTION 'La tabla complejos ya existe — la migración ya fue aplicada. Abortando.';
  END IF;
END $$;

-- ---------- 1) NUEVAS TABLAS ----------

-- Un registro por complejo deportivo registrado en la plataforma
CREATE TABLE public.complejos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(120) NOT NULL,
  slug varchar(140) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo varchar(20) NOT NULL DEFAULT 'complejo_deportivo'
    CHECK (tipo IN ('fraccionado', 'complejo_deportivo')),
  ciudad varchar(80),
  direccion varchar(160),
  telefono varchar(40),
  email_contacto varchar(120),
  descripcion text,
  -- horarios del día operativo (mismos defaults que hoy)
  hora_apertura time NOT NULL DEFAULT '08:00',
  hora_cierre   time NOT NULL DEFAULT '23:00',
  -- políticas
  cancelacion_minima_horas numeric NOT NULL DEFAULT 2,
  descuento_turno_fijo_porcentaje numeric NOT NULL DEFAULT 0,
  sena_obligatoria boolean NOT NULL DEFAULT false,
  -- amenidades / servicios del complejo
  gym boolean NOT NULL DEFAULT false,
  pileta boolean NOT NULL DEFAULT false,
  precio_mensual_gym numeric,
  precio_mensual_pileta numeric,
  ofrece_socios boolean NOT NULL DEFAULT false,
  ofrece_torneos boolean NOT NULL DEFAULT true,
  amenidades text[] NOT NULL DEFAULT '{}', -- ej: '{buffet,estacionamiento,duchas}'
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Suscripción mensual de cada complejo (cobro MANUAL desde el panel plataforma)
CREATE TABLE public.suscripciones (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complejo_id integer NOT NULL REFERENCES public.complejos(id) ON DELETE CASCADE,
  plan varchar(20) NOT NULL DEFAULT 'completo',
  estado varchar(10) NOT NULL DEFAULT 'prueba'
    CHECK (estado IN ('prueba', 'activa', 'vencida', 'cancelada')),
  monto numeric NOT NULL DEFAULT 50000,
  inicio date NOT NULL DEFAULT CURRENT_DATE,
  fin date, -- prueba: inicio + 14 días. activa cortesía: NULL (sin vencimiento)
  metodo_pago varchar(20) CHECK (metodo_pago IN ('efectivo', 'transferencia', 'otro')),
  registrada_por uuid REFERENCES public.usuarios(id), -- super_admin que la activó
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suscripciones_complejo ON public.suscripciones (complejo_id, estado, fin DESC);

-- Membresía usuario ↔ complejo con rol propio del complejo.
-- Un usuario puede ser DUEÑO de un complejo y CLIENTE en otro.
-- (el rol global usuarios.rol queda solo como: super_admin = plataforma, cliente = jugador)
CREATE TABLE public.complejo_usuarios (
  complejo_id integer NOT NULL REFERENCES public.complejos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  rol varchar(15) NOT NULL CHECK (rol IN ('dueno', 'recepcionista')),
  creado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (complejo_id, usuario_id)
);
CREATE INDEX idx_complejo_usuarios_usuario ON public.complejo_usuarios (usuario_id);

-- ---------- 2) complejo_id EN TABLAS DE NEGOCIO ----------
ALTER TABLE public.canchas           ADD COLUMN complejo_id integer;
ALTER TABLE public.reservas          ADD COLUMN complejo_id integer;
ALTER TABLE public.bloqueos_horarios ADD COLUMN complejo_id integer;
ALTER TABLE public.movimientos_caja  ADD COLUMN complejo_id integer;
ALTER TABLE public.abonos            ADD COLUMN complejo_id integer;
ALTER TABLE public.beneficios_socios ADD COLUMN complejo_id integer;
ALTER TABLE public.torneos           ADD COLUMN complejo_id integer;
-- tarifas se scopean vía cancha · equipos/partidos/inscripciones vía torneo · socio_beneficios vía beneficio

-- ---------- 3) BACKFILL: datos actuales → Complejo #1 ----------
WITH kv AS (
  SELECT categoria || '.' || clave AS k, (valor::jsonb #>> '{}') AS v
  FROM public.configuracion_valores
  WHERE valor IS NOT NULL AND btrim(valor) <> ''
),
piv AS (
  SELECT
    max(v) FILTER (WHERE k = 'metadatos.nombre')                       AS nombre,
    max(v) FILTER (WHERE k = 'metadatos.tipo')                         AS tipo,
    max(v) FILTER (WHERE k = 'metadatos.hora_apertura')                AS hora_apertura,
    max(v) FILTER (WHERE k = 'metadatos.hora_cierre')                  AS hora_cierre,
    max(v) FILTER (WHERE k = 'politicas.cancelacion_minima_horas')     AS cancelacion,
    max(v) FILTER (WHERE k = 'politicas.descuento_turno_fijo_porcentaje') AS descuento,
    max(v) FILTER (WHERE k = 'politicas.seña_obligatoria')             AS sena,
    max(v) FILTER (WHERE k = 'amenidades.gym')                         AS gym,
    max(v) FILTER (WHERE k = 'amenidades.pileta')                      AS pileta,
    max(v) FILTER (WHERE k = 'amenidades.precio_mensual_gym')          AS precio_gym,
    max(v) FILTER (WHERE k = 'amenidades.precio_mensual_pileta')       AS precio_pileta,
    max(v) FILTER (WHERE k = 'socios.ofrece_socios')                   AS socios,
    max(v) FILTER (WHERE k = 'torneos.ofrece_torneos')                 AS torneos
  FROM kv
)
INSERT INTO public.complejos (
  nombre, slug, tipo, hora_apertura, hora_cierre,
  cancelacion_minima_horas, descuento_turno_fijo_porcentaje, sena_obligatoria,
  gym, pileta, precio_mensual_gym, precio_mensual_pileta,
  ofrece_socios, ofrece_torneos
)
SELECT
  COALESCE(NULLIF(btrim(nombre), ''), 'Mi Complejo'),
  'complejo-1',
  CASE WHEN tipo IN ('fraccionado', 'complejo_deportivo') THEN tipo ELSE 'complejo_deportivo' END,
  CASE WHEN hora_apertura ~ '^[0-9]{1,2}$'      THEN make_time(hora_apertura::int, 0, 0)
       WHEN hora_apertura ~ '^[0-9]{1,2}:[0-9]{2}' THEN hora_apertura::time
       ELSE '08:00'::time END,
  CASE WHEN hora_cierre ~ '^[0-9]{1,2}$'        THEN make_time(hora_cierre::int, 0, 0)
       WHEN hora_cierre ~ '^[0-9]{1,2}:[0-9]{2}'   THEN hora_cierre::time
       ELSE '23:00'::time END,
  COALESCE(NULLIF(cancelacion, '')::numeric, 2),
  COALESCE(NULLIF(descuento, '')::numeric, 0),
  lower(COALESCE(sena, 'false')) IN ('true', '1', 'si', 'sí'),
  lower(COALESCE(gym, 'false')) IN ('true', '1', 'si', 'sí'),
  lower(COALESCE(pileta, 'false')) IN ('true', '1', 'si', 'sí'),
  NULLIF(precio_gym, '')::numeric,
  NULLIF(precio_pileta, '')::numeric,
  lower(COALESCE(socios, 'false')) IN ('true', '1', 'si', 'sí'),
  lower(COALESCE(torneos, 'true')) IN ('true', '1', 'si', 'sí')
FROM piv;

-- Si no había configuración previa, igual creamos el complejo base
INSERT INTO public.complejos (nombre, slug)
SELECT 'Mi Complejo', 'complejo-1'
WHERE NOT EXISTS (SELECT 1 FROM public.complejos WHERE slug = 'complejo-1');

DO $$
DECLARE c_id integer;
BEGIN
  SELECT id INTO c_id FROM public.complejos WHERE slug = 'complejo-1';

  UPDATE public.canchas           SET complejo_id = c_id;
  UPDATE public.reservas          SET complejo_id = c_id;
  UPDATE public.bloqueos_horarios SET complejo_id = c_id;
  UPDATE public.movimientos_caja  SET complejo_id = c_id;
  UPDATE public.abonos            SET complejo_id = c_id;
  UPDATE public.beneficios_socios SET complejo_id = c_id;
  UPDATE public.torneos           SET complejo_id = c_id;

  -- Dueños actual del complejo #1 = super_admins del sistema
  INSERT INTO public.complejo_usuarios (complejo_id, usuario_id, rol)
    SELECT c_id, id, 'dueno' FROM public.usuarios WHERE rol = 'super_admin';

  -- Recepcionistas globales → membresía de recepcionista del complejo #1
  INSERT INTO public.complejo_usuarios (complejo_id, usuario_id, rol)
    SELECT c_id, id, 'recepcionista' FROM public.usuarios
    WHERE rol = 'recepcionista'
    ON CONFLICT DO NOTHING;

  -- Suscripción de cortesía sin vencimiento (complejo fundador)
  INSERT INTO public.suscripciones (complejo_id, estado, monto, inicio, fin, metodo_pago, notas)
    VALUES (c_id, 'activa', 0, CURRENT_DATE, NULL, 'otro',
            'Complejo #1 — cortesía fundador (migración multi-tenant)');
END $$;

-- ---------- 4) NOT NULL + FK + ÍNDICES ----------
ALTER TABLE public.canchas           ALTER COLUMN complejo_id SET NOT NULL;
ALTER TABLE public.reservas          ALTER COLUMN complejo_id SET NOT NULL;
ALTER TABLE public.bloqueos_horarios ALTER COLUMN complejo_id SET NOT NULL;
ALTER TABLE public.movimientos_caja  ALTER COLUMN complejo_id SET NOT NULL;
ALTER TABLE public.abonos            ALTER COLUMN complejo_id SET NOT NULL;
ALTER TABLE public.beneficios_socios ALTER COLUMN complejo_id SET NOT NULL;
ALTER TABLE public.torneos           ALTER COLUMN complejo_id SET NOT NULL;

ALTER TABLE public.canchas           ADD CONSTRAINT canchas_complejo_fkey           FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;
ALTER TABLE public.reservas          ADD CONSTRAINT reservas_complejo_fkey          FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;
ALTER TABLE public.bloqueos_horarios ADD CONSTRAINT bloqueos_complejo_fkey          FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;
ALTER TABLE public.movimientos_caja  ADD CONSTRAINT movimientos_caja_complejo_fkey  FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;
ALTER TABLE public.abonos            ADD CONSTRAINT abonos_complejo_fkey            FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;
ALTER TABLE public.beneficios_socios ADD CONSTRAINT beneficios_socios_complejo_fkey FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;
ALTER TABLE public.torneos           ADD CONSTRAINT torneos_complejo_fkey           FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE CASCADE;

CREATE INDEX idx_canchas_complejo          ON public.canchas (complejo_id);
CREATE INDEX idx_reservas_complejo_fecha   ON public.reservas (complejo_id, fecha);
CREATE INDEX idx_reservas_complejo_cc_fecha ON public.reservas (complejo_id, cancha_id, fecha);
CREATE INDEX idx_movcaja_complejo_fecha    ON public.movimientos_caja (complejo_id, fecha_hora);
CREATE INDEX idx_abonos_complejo           ON public.abonos (complejo_id);
CREATE INDEX idx_torneos_complejo          ON public.torneos (complejo_id);
CREATE INDEX idx_bloqueos_complejo         ON public.bloqueos_horarios (complejo_id);

-- ---------- 5) RLS: acceso solo vía API (service_role) ----------
ALTER TABLE public.complejos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complejo_usuarios ENABLE ROW LEVEL SECURITY;
-- Sin policies ⇒ el cliente anon/auth no lee estas tablas; todo pasa por el backend filtrado.

-- ---------- 6) DROP de la config single-tenant vieja ----------
DROP TABLE public.configuracion_valores;
DROP TABLE public.configuracion_complejo;

COMMIT;

-- ROLLBACK (solo si hay que revertir antes de seguir con el backend):
--   ALTER TABLE public.canchas DROP CONSTRAINT canchas_complejo_fkey; (ídem las demás)
--   ALTER TABLE ... DROP COLUMN complejo_id; (ídem las 7 tablas)
--   DROP TABLE public.complejo_usuarios; DROP TABLE public.suscripciones; DROP TABLE public.complejos;
--   (configuracion_valores / configuracion_complejo NO se pueden restaurar automáticamente —
--    exportarlas antes si querés red de seguridad: SELECT set_config(...) o pg_dump.)
