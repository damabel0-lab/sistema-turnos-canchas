-- ============================================================
-- PlayControl - Índices recomendados para producción
-- Correr en el SQL Editor de Supabase (una sola vez)
-- No modifican los datos existentes, solo optimizan lecturas
-- ============================================================

-- Reservas: consultas frecuentes por cancha + fecha + estado
CREATE INDEX IF NOT EXISTS idx_reservas_cancha_fecha ON public.reservas (cancha_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_fecha ON public.reservas (usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON public.reservas (estado);

-- Bloqueos: superposición de rangos horarios
CREATE INDEX IF NOT EXISTS idx_bloqueos_cancha_fecha ON public.bloqueos_horarios (cancha_id, fecha_inicio, fecha_fin);

-- Movimientos de caja: filtro por fecha y tipo
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON public.movimientos_caja (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON public.movimientos_caja (tipo_movimiento);

-- Abonos: consulta de abonos activos por usuario
CREATE INDEX IF NOT EXISTS idx_abonos_usuario ON public.abonos (usuario_id, activo);

-- Torneos: partidos por torneo y fecha
CREATE INDEX IF NOT EXISTS idx_partidos_torneo ON public.partidos_torneo (torneo_id, fecha_hora);
