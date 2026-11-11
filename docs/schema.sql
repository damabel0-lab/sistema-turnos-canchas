-- ============================================================
-- PlayControl - Esquema base (Supabase / PostgreSQL)
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE rol_usuario AS ENUM ('super_admin', 'recepcionista', 'cliente');
CREATE TYPE tipo_disciplina AS ENUM ('cancha', 'gimnasio', 'pileta', 'otro');
CREATE TYPE estado_reserva AS ENUM ('pendiente_seña', 'confirmada', 'cancelada', 'completada');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'transferencia', 'mercado_pago', 'tarjeta');

-- ---------- USUARIOS ----------
CREATE TABLE public.usuarios (
  id uuid NOT NULL,
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  telefono character varying,
  rol rol_usuario DEFAULT 'cliente',
  es_socio boolean DEFAULT false,
  creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- ---------- DISCIPLINAS ----------
CREATE TABLE public.deportes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL UNIQUE,
  tipo tipo_disciplina DEFAULT 'cancha',
  requiere_cancha boolean DEFAULT true
);

-- ---------- CANCHAS ----------
CREATE TABLE public.canchas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL,
  deporte_id integer REFERENCES public.deportes(id),
  precio_base numeric NOT NULL,
  activa boolean DEFAULT true,
  caracteristicas text
);

-- ---------- TARIFAS (opcionales por complejo) ----------
-- dia_semana NULL = aplica todos los días (0 = domingo ... 6 = sábado)
CREATE TABLE public.tarifas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cancha_id integer REFERENCES public.canchas(id),
  dia_semana integer CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time WITHOUT TIME ZONE NOT NULL,
  hora_fin time WITHOUT TIME ZONE NOT NULL,
  precio numeric NOT NULL,
  porcentaje_seña numeric DEFAULT 0.00
);

-- ---------- SOCIOS / BENEFICIOS ----------
CREATE TABLE public.beneficios_socios (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_beneficio character varying NOT NULL,
  descuento_porcentaje numeric DEFAULT 0.00,
  aplica_en tipo_disciplina DEFAULT 'cancha'
);

CREATE TABLE public.socio_beneficios (
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  beneficio_id integer NOT NULL REFERENCES public.beneficios_socios(id),
  CONSTRAINT socio_beneficios_pkey PRIMARY KEY (usuario_id, beneficio_id)
);

-- ---------- ABONOS (gimnasio / pileta) ----------
CREATE TABLE public.abonos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid REFERENCES public.usuarios(id),
  disciplina_id integer REFERENCES public.deportes(id),
  clases_totales integer NOT NULL,
  clases_disponibles integer NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_vencimiento date NOT NULL,
  monto_pagado numeric NOT NULL,
  activo boolean DEFAULT true
);

-- ---------- RESERVAS ----------
-- cancha_id NULL = disciplina individual (gimnasio / pileta)
CREATE TABLE public.reservas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid REFERENCES public.usuarios(id),
  cancha_id integer REFERENCES public.canchas(id),
  fecha date NOT NULL,
  hora_inicio time WITHOUT TIME ZONE NOT NULL,
  hora_fin time WITHOUT TIME ZONE NOT NULL,
  precio_total numeric NOT NULL,
  monto_seña numeric DEFAULT 0.00,
  metodo_pago metodo_pago,
  estado estado_reserva DEFAULT 'pendiente_seña',
  es_turno_fijo boolean DEFAULT false,
  creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---------- NOTIFICACIONES ----------
CREATE TABLE public.notificaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo character varying NOT NULL DEFAULT 'info',
  titulo character varying NOT NULL,
  cuerpo text NOT NULL,
  leida boolean NOT NULL DEFAULT false,
  creada_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notificaciones_usuario ON public.notificaciones (usuario_id, creada_en DESC);

-- ---------- BLOQUEOS ----------
CREATE TABLE public.bloqueos_horarios (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cancha_id integer REFERENCES public.canchas(id),
  fecha_inicio timestamp with time zone NOT NULL,
  fecha_fin timestamp with time zone NOT NULL,
  motivo character varying NOT NULL
);

-- ---------- CAJA ----------
CREATE TABLE public.movimientos_caja (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reserva_id integer REFERENCES public.reservas(id),
  usuario_id uuid REFERENCES public.usuarios(id),
  monto numeric NOT NULL,
  tipo_movimiento character varying CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
  metodo_pago metodo_pago NOT NULL,
  descripcion text NOT NULL,
  fecha_hora timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- ---------- TORNEOS ----------
CREATE TABLE public.torneos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL,
  deporte_id integer REFERENCES public.deportes(id),
  fecha_inicio date NOT NULL,
  fecha_fin date,
  premio text,
  activo boolean DEFAULT true
);

CREATE TABLE public.equipos_torneo (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  torneo_id integer REFERENCES public.torneos(id),
  nombre_equipo character varying NOT NULL,
  capitan_id uuid REFERENCES public.usuarios(id)
);

CREATE TABLE public.partidos_torneo (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  torneo_id integer REFERENCES public.torneos(id),
  equipo_local_id integer REFERENCES public.equipos_torneo(id),
  equipo_visitante_id integer REFERENCES public.equipos_torneo(id),
  cancha_id integer REFERENCES public.canchas(id),
  fecha_hora timestamp with time zone NOT NULL,
  goles_local integer DEFAULT 0,
  goles_visitante integer DEFAULT 0,
  jugado boolean DEFAULT false,
  fase character varying DEFAULT 'Grupos'
);
