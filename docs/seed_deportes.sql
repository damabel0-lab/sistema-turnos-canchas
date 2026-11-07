-- PlayControl - Deportes predeterminados
-- Correr una sola vez en el SQL Editor (ON CONFLICT evita duplicados)
INSERT INTO public.deportes (nombre, tipo, requiere_cancha) VALUES
  ('Fútbol 5',        'cancha',   true),
  ('Fútbol 7',        'cancha',   true),
  ('Fútbol 11',       'cancha',   true),
  ('Pádel',           'cancha',   true),
  ('Tenis',           'cancha',   true),
  ('Básquet',         'cancha',   true),
  ('Vóley',           'cancha',   true),
  ('Hockey',          'cancha',   true),
  ('Gimnasio',        'gimnasio', false),
  ('Pileta',          'pileta',   false),
  ('Otro',            'otro',     true)
ON CONFLICT (nombre) DO NOTHING;
