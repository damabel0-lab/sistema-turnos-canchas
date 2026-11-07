# PlayControl — Checklist general

> Fuente de verdad del proyecto. Marcar ✅ a medida que avanza.
> Última actualización: inicio de desarrollo.

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
- [x] Crear esqueleto backend (Express, auth middleware, 6 módulos con TODOs)
- [x] Crear esqueleto frontend (rutas, páginas cliente/admin, cliente Supabase)
- [x] `typecheck` verde en backend y frontend
- [x] Configurar Git local (usuarios de ambos integrantes)
- [x] Conectar repositorio en GitHub y hacer push inicial
- [x] Conexión a Supabase verificada: claves reales en `.env` locales (no se suben a Git) y las 13 tablas responden

## Fase 1 — Base de datos y Auth
- [x] Pegar `docs/schema.sql` en Supabase y verificar que corre (13 tablas OK, 0 filas)
- [x] Configurar RLS básico (policies de `usuarios`: propio + staff, verificado en pruebas)
- [x] Login/registro con email (Supabase Auth) — probado de punta a punta
- [ ] Login con Google (si habilitan el provider)
- [ ] Login con OTP WhatsApp/celular (si habilitan el provider)
- [x] Tabla `usuarios`: registro automático del perfil al hacer signup
- [ ] Asignación de roles (super_admin / recepcionista / cliente) — roles usados en el código; falta UI/admin de alta de staff
- [x] Ruta `/admin` protegida por rol en frontend (RutaProtegida, caja solo super_admin)

## Fase 2 — Módulo de canchas, deportes y tarifas
- [x] Alta/baja/edición de canchas (admin) — alta + activar/desactivar (editar precio en próximo paso)
- [x] Alta de deportes predeterminados + personalizados (seed + alta desde panel)
- [x] Precio base de cancha
- [x] Seña opcional por cancha (% configurable vía tarifa)
- [ ] Descuento / incentivo / nada (opciones de precio) — parcial: descuento de socio y turno fijo en el cotizador
- [x] Tarifas opcionales: franja horaria (pico/nocturno)
- [x] Tarifas opcionales: día de la semana (NULL = todos los días)
- [x] Tarifa por disciplina (vía beneficios aplica_en)
- [x] Cálculo de precio final (cotizador hora por hora + seña + descuentos) — probado con 5 casos

## Fase 3 — Reservas y grilla (el núcleo)
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

## Fase 4 — Socios y beneficios
- [ ] Alta/baja de socios (admin)
- [ ] Catálogo de beneficios con % de descuento
- [ ] Asignar beneficios a socios (por disciplina/lugar)
- [ ] Descuento automático de socio aplicado al reservar
- [ ] Cliente: opción "hacerse socio" (si el complejo lo permite)

## Fase 5 — Abonos gym / pileta
- [ ] Venta de abono mensual por cantidad de clases
- [ ] Venta de abono por clases sueltas (pase por clase)
- [ ] Consumo de 1 clase al reservar/asistir (descuento de `clases_disponibles`)
- [ ] Control de vencimiento y estado (activo/inactivo)
- [ ] Cliente: ver "mis abonos / accesos restantes"

## Fase 6 — Caja, cobros y finanzas
- [x] Registrar pago de seña (efectivo / transferencia / MP / tarjeta) — al confirmar reserva
- [x] Confirmación manual de comprobante por admin (botón "Confirmar pago" en la grilla)
- [x] Registro de movimientos de caja (ingreso/egreso) ligado a reservas — automático
- [x] Detalle de ingresos por origen (señas, turnos, abonos, egresos...)
- [x] Resumen día / semana / mes (totales + por método de pago)
- [x] Arqueo / cierre de caja del día — ver resumen "Día" + detalle (falta exportar/imprimir)
- [x] Filtro por método de pago
- [x] Historial de precios inmutable en reservas (ya garantizado por diseño)
- [ ] Reportes por disciplina (Fase 8)

## Fase 7 — Panel del cliente
- [x] Registro/login simple
- [x] "Mis Reservas": próximos turnos + botón cancelar (historial aparte)
- [ ] Historial de actividad (veces jugadas, gasto, disciplinas) — parcial: hay historial de reservas
- [ ] Mis abonos/pases (Fase 5)
- [ ] Turnos fijos desde el lado del cliente
- [ ] Perfil (nombre, apellido, teléfono) — datos se cargan al registrarse

## Fase 8 — Reportes y estadísticas
- [ ] Ocupación por cancha y horario
- [ ] Horarios pico vs. muertos (para armar promociones)
- [ ] Recaudación por disciplina (día/semana/mes)
- [ ] Exportar / imprimir corte de caja

## Fase 9 — Torneos
- [ ] Alta de torneo (nombre, deporte, fechas, premio)
- [ ] Alta de equipos + capitanes
- [ ] Generación de fixtures / cruces (fases)
- [ ] Carga de resultados
- [ ] Tabla de posiciones automática
- [ ] Vista pública para jugadores (fixture, tabla, resultados)

## Fase 10 — Notificaciones
- [ ] Estructura del módulo de notificaciones (ya creado)
- [ ] Recordatorio automático antes del turno (email)
- [ ] Aviso masivo de suspensión por lluvia
- [ ] Bandeja de notificaciones in-app
- [ ] (Futuro) Integración WhatsApp / MercadoPago webhook

## Fase 11 — Pulido y entrega
- [ ] Estilo/identidad visual (reemplazar CSS placeholder)
- [ ] Estados de carga y errores en todas las vistas
- [ ] Responsive (se usa desde el celular en recepción)
- [ ] Seed de datos de prueba
- [ ] README final con instrucciones de instalación
- [ ] Deploy (frontend + backend) y dominio
- [ ] Último push a GitHub + entrega del TFI
