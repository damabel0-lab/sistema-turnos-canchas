-- ============================================================
-- PlayControl - Row Level Security (RLS)
-- Correr en el SQL Editor de Supabase DESPUÉS de schema.sql
-- ============================================================

-- ---------- Helper: detectar staff (super_admin / recepcionista) ----------
-- Nota: evita recursión de policies consultando el rol del usuario actual.
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol IN ('super_admin', 'recepcionista')
  );
$$;

-- ---------- USUARIOS ----------
-- El cliente solo ve/edita su propio perfil; el staff ve todos.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_select_propio_o_staff"
  ON public.usuarios FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT public.es_staff())
  );

-- Alta de perfil al registrarse: solo puede insertar su propio id.
-- (sin esto, el registro desde el frontend falla con RLS activo)
CREATE POLICY "usuarios_insert_propio"
  ON public.usuarios FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios_update_propio_o_staff"
  ON public.usuarios FOR UPDATE
  USING (
    id = auth.uid()
    OR (SELECT public.es_staff())
  )
  WITH CHECK (
    id = auth.uid()
    OR (SELECT public.es_staff())
  );

-- ============================================================
-- Pendiente (siguientes fases): policies para el resto de tablas
-- (reservas, canchas, caja, etc.) — la mayoría se tocará desde
-- el backend con service_role, que NO está limitado por RLS.
-- ============================================================
