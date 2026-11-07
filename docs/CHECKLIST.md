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
- [ ] Configurar Git local (usuarios de ambos integrantes)
- [ ] Conectar repositorio en GitHub y hacer push inicial

## Fase 1 — Base de datos y Auth
- [ ] Pegar `docs/schema.sql` en Supabase y verificar que corre
- [ ] Configurar RLS básico (el cliente solo lee lo permitido)
- [ ] Login/registro con email (Supabase Auth)
- [ ] Login con Google (si habilitan el provider)
- [ ] Login con OTP WhatsApp/celular (si habilitan el provider)
- [ ] Tabla `usuarios`: registro automático del perfil al hacer signup
- [ ] Asignación de roles (super_admin / recepcionista / cliente)
- [ ] Ruta `/admin` protegida por rol en frontend

## Fase 2 — Módulo de canchas, deportes y tarifas
- [ ] Alta/baja/edición de canchas (admin)
- [ ] Alta de deportes predeterminados + personalizados
- [ ] Precio base de cancha
- [ ] Seña opcional por cancha (% configurable)
- [ ] Descuento / incentivo / nada (opciones de precio)
- [ ] Tarifas opcionales: franja horaria (pico/nocturno)
- [ ] Tarifas opcionales: día de la semana (NULL = todos los días)
- [ ] Tarifa por disciplina
- [ ] Cálculo de precio final (servicio backend: precio_base + tarifas + descuentos + socios)

## Fase 3 — Reservas y grilla (el núcleo)
- [ ] Grilla/calendario visual por cancha del día (admin)
- [ ] Estados: pendiente_seña → confirmada → completada / cancelada
- [ ] Carga manual rápida (nombre + teléfono, sin login)
- [ ] Bloqueo de horarios (mantenimiento, eventos, lluvia)
- [ ] Colchón de 20 min automático en canchas multideporte
- [ ] Reserva del cliente en 3 clicks (deporte → cancha → horario → confirmar)
- [ ] Grilla de horarios solo con turnos libres
- [ ] Evitar doble reserva (validación server-side + restricción DB)
- [ ] Cancelación con política configurable
- [ ] Turnos fijos: flag + generación automática de reservas semanales
- [ ] Descuento opcional para clientes con turno fijo

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
- [ ] Registrar pago de seña (efectivo / transferencia / MP / tarjeta)
- [ ] Confirmación manual de comprobante por admin
- [ ] Registro de movimientos de caja (ingreso/egreso) ligado a reservas
- [ ] Detalle de ingresos por origen (cancha X, mensual gym, clase pileta...)
- [ ] Resumen día / semana / mes
- [ ] Arqueo / cierre de caja del día
- [ ] Filtro por método de pago
- [ ] Historial de precios inmutable en reservas (ya garantizado por diseño)

## Fase 7 — Panel del cliente
- [ ] Registro/login simple
- [ ] "Mis Reservas": próximos turnos + botón recordar/cancelar
- [ ] Historial de actividad (veces jugadas, gasto, disciplinas)
- [ ] Mis abonos/pases
- [ ] Turnos fijos desde el lado del cliente
- [ ] Perfil (nombre, apellido, teléfono)

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
