-- PlayControl - Deportes predeterminados
-- Correr una sola vez en el SQL Editor (ON CONFLICT evita duplicados)
-- El dueño del complejo puede agregar más deportes desde el panel admin.
INSERT INTO public.deportes (nombre, tipo, requiere_cancha) VALUES
  ('Fútbol Sintético 5',  'cancha',   true),
  ('Fútbol Sintético 7',  'cancha',   true),
  ('Pádel',               'cancha',   true),
  ('Básquet',             'cancha',   true),
  ('Tenis',               'cancha',   true),
  ('Gimnasio',            'gimnasio', false),
  ('Pileta',              'pileta',   false)
ON CONFLICT (nombre) DO NOTHING;
