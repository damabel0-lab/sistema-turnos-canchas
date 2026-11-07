# PlayControl — Checklist general

> Fuente de verdad del proyecto. Marcar ✅ a medida que avanza.
> Última actualización: pulido final.

---

## Forma de trabajo

- **División intercalada:** 2 commits de Nahuel → 2 commits de Damian → 2 de Nahuel... sucesivamente durante todo el proyecto.
- **Autoría:** cada commit se hace con la identidad de quien le toca el turno.
- **Mensajes en español** con formato convencional: `feat(modulo): ...`, `fix(modulo): ...`, `chore: ...`, `docs: ...`.
- **Un commit = una idea.** Al cerrar una tarea se marca ✅ acá y se commitea junto con el código.
- **Push a GitHub:** siempre con autorización explícita previa.

---

## Fase 0 — Setup del proyecto ✅
- [x] Borrar código anterior y dejar estructura de carpetas
- [x] Definir base de datos (12 tablas + 4 enums) → `docs/schema.sql`
- [x] Definir ideas, reglas y objetivos del proyecto
- [x] Definir stack (React+Vite+TS / Node+Express+TS / Supabase)
- [x] Crear esqueleto backend (Express, auth middleware, módulos con TODOs)
- [x] Crear esqueleto frontend (rutas, páginas cliente/admin, cliente Supabase)
- [x] `typecheck` verde en backend y frontend
- [x] Configurar Git local (usuarios de ambos integrantes)
- [x] Conectar repositorio en GitHub y hacer push inicial

## Fase 1 — Base de datos y Auth ✅
- [x] Pegar `docs/schema.sql` en Supabase y verificar que corre (13 tablas OK, 0 filas)
- [x] Configurar RLS básico (policies de `usuarios`: propio + staff, verificado en pruebas)
- [x] Login/registro con email (Supabase Auth) — probado de punta a punta
- [ ] Login con Google (si habilitan el provider)
- [ ] Login con OTP WhatsApp/celular (si habilitan el provider)
- [x] Tabla `usuarios`: registro automático del perfil al hacer signup
- [ ] Asignación de roles (super_admin / recepcionista / cliente) — roles usados en el código; falta UI/admin de alta de staff
- [x] Ruta `/admin` protegida por rol en frontend (RutaProtegida, caja solo super_admin)

## Fase 2 — Canchas, deportes y tarifas ✅
- [x] Alta/baja/edición de canchas (admin) — alta + activar/desactivar
- [x] Alta de deportes predeterminados + personalizados (seed + alta desde panel)
- [x] Precio base de cancha
- [x] Seña opcional por cancha (% configurable vía tarifa)
- [ ] Descuento / incentivo / nada (opciones de precio) — parcial: descuento de socio y turno fijo en el cotizador
- [x] Tarifas opcionales: franja horaria (pico/nocturno)
- [x] Tarifas opcionales: día de la semana (NULL = todos los días)
- [x] Tarifa por disciplina (vía beneficios aplica_en)
- [x] Cálculo de precio final (cotizador hora por hora + seña + descuentos) — probado con 5 casos

## Fase 3 — Reservas y grilla (el núcleo) ✅
- [x] Grilla/calendario visual por cancha del día (admin) — colores por estado + resumen de cobro
- [x] Estados: pendiente_seña → confirmada → completada / cancelada (con registro en caja)
- [x] Carga manual rápida (nombre + teléfono, crea cliente si no existe)
- [x] Bloqueo de horarios (mantenimiento, eventos, lluvia) — alta desde la grilla
- [ ] Colchón de 20 min automático en canchas multideporte
- [x] Reserva del cliente en 3 clicks (deporte → cancha → horario → resumen con precio)
- [x] Grilla de horarios solo con turnos libres (libre/ocupada/bloqueada)
- [x] Evitar doble reserva (409 server-side + refresco de grilla en el front)
- [x] Cancelación — política simple: cliente cancela sus futuras; staff cancela cualquiera
- [ ] Turnos fijos: flag + generación automática de reservas semanales
- [ ] Descuento opcional para clientes con turno fijo (parámetro listo en el cotizador)

## Fase 4 — Socios y beneficios ✅
- [x] Alta/baja de socios (admin)
- [x] Catálogo de beneficios con % de descuento
- [x] Asignar beneficios a socios (por disciplina/lugar)
- [x] Descuento automático de socio aplicado al reservar (en el cotizador)
- [ ] Cliente: opción "hacerse socio" (si el complejo lo permite)

## Fase 5 — Abonos gym / pileta ✅
- [x] Venta de abono mensual por cantidad de clases
- [x] Venta de abono por clases sueltas (pase por clase)
- [x] Consumo de 1 clase al reservar/asistir (descuento de `clases_disponibles`)
- [x] Control de vencimiento y estado (activo/inactivo)
- [x] Cliente: ver "mis abonos / accesos restantes"

## Fase 6 — Caja, cobros y finanzas ✅
- [x] Registrar pago de seña (efectivo / transferencia / MP / tarjeta) — al confirmar reserva
- [x] Confirmación manual de comprobante por admin (botón "Confirmar pago" en la grilla)
- [x] Registro de movimientos de caja (ingreso/egreso) ligado a reservas — automático
- [x] Detalle de ingresos por origen (señas, turnos, abonos, egresos...)
- [x] Resumen día / semana / mes (totales + por método de pago)
- [x] Arqueo / cierre de caja del día — ver resumen "Día" + detalle
- [x] Filtro por método de pago
- [x] Historial de precios inmutable en reservas (ya garantizado por diseño)
- [x] Reporte de recaudación por disciplina / origen

## Fase 7 — Panel del cliente ✅ (casi completo)
- [x] Registro/login simple
- [x] "Mis Reservas": próximos turnos + botón cancelar (historial aparte)
- [x] Mis abonos/pases
- [ ] Historial de actividad (veces jugadas, gasto, disciplinas) — parcial: hay historial de reservas
- [ ] Turnos fijos desde el lado del cliente
- [x] Perfil (nombre, apellido, teléfono) — se cargan al registrarse

## Fase 8 — Reportes y estadísticas ✅ (parcial)
- [x] Ocupación y horarios pico (vista de grilla)
- [x] Cortes de caja: diarios/semanales/mensuales por disciplina (reporte por origen)
- [ ] Promociones automáticas (ej. 2x1 los martes)

## Fase 9 — Torneos ✅
- [x] Módulo de Torneos: crear campeonatos, generar equipos, fixture
- [x] Cargar resultados de partidos
- [x] Tabla de posiciones automática
- [x] Vista pública para jugadores (fixture, tabla, resultados)

## Fase 10 — Notificaciones ✅
- [x] Estructura del módulo de notificaciones
- [x] Recordatorio de turno (crear manualmente desde staff)
- [x] Aviso masivo de suspensión (lluvia)
- [x] Bandeja de notificaciones in-app para el cliente
- [ ] (Futuro) Integración WhatsApp / MercadoPago webhook

## Fase 11 — Pulido y entrega
- [x] README con instrucciones de setup y roles
- [x] typecheck verde en backend y frontend
- [ ] Estilo/identidad visual (reemplazar CSS placeholder)
- [ ] Deploy y dominio
