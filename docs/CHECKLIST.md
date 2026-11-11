# PlayControl — Checklist general

> Fuente de verdad del proyecto. Marcar ✅ a medida que avanza.
> Última actualización: cierre completo de Fase 1-10 + pulido de Fase 11.
> **Fase MercadoPago / WhatsApp + Deploy queda explícitamente fuera de esta iteración** (pendiente académico).

---

## Forma de trabajo

- **División intercalada:** 2 commits de Nahuel → 2 de Damian → 2 de Nahuel... (aproximado; cada uno puede llevar un módulo completo de punta a punta).
- **Autoría:** cada commit se hace con la identidad de quien le toca el turno.
- **Mensajes en español con formato convencional:** `feat(modulo): ...`, `fix(modulo): ...`, `chore: ...`, `docs: ...`.
- **Intencionalidad:** una feature/bug por commit; los intermedios son commits internos de la misma rama.
- **Push a GitHub:** siempre con autorización o tras un avance importante completado; el progreso es solo local hasta ese punto.

---

## Fase 0 — Setup del proyecto ✅
- [x] Borrar código anterior y dejar estructura de carpetas
- [x] Definir base de datos (tablas + enums) → `docs/schema.sql`
- [x] Definir ideas, reglas y objetivos del proyecto
- [x] Definir stack (React+Vite+TS / Node+Express+TS / Supabase)
- [x] Crear esqueleto backend y frontend
- [x] typecheck verde en backend y frontend
- [x] Configurar Git local y conexión con el repositorio

## Fase 1 — Base de datos y Auth ✅ (casi completa)
- [x] `schema.sql` + `configuracion_complejo.sql` + `notificaciones.sql` + `abonos_mensualidad.sql` + `indices.sql` (en orden)
- [x] Email/password signup → profile auto en `usuarios`
- [x] Login / registro (Supabase Auth) — verificado end-to-end
- [x] `RutaProtegida` por rol (staff solo ve admin; clientes no)
- [x] Acceso `/admin/*` sólo para staff (admin + recepción)
- [x] Admin solo super_admin: caja, reportes, configuración, cajas CSV
- [ ] Asignación de roles desde UI (super_admin a recepcionista hoy es manual en Supabase)
- [ ] Login con Google / OTP WhatsApp (no requerido para MVP)

## Fase 2 — Canchas, deportes y tarifas ✅
- [x] Alta/baja/edición de canchas (props reales en listado)
- [x] Alta de deportes predeterminados + personalizados (seed + panel)
- [x] Precio base por cancha
- [x] Tarifas opcionales: franja horaria / día de semana (cotizador hora por hora)
- [x] Descuento automático de socio + turno fijo en el cálculo
- [x] Abono de turno fijo: aplicar descuento si lo configura el dueño (via Configuración)

## Fase 3 — Reservas y grilla (el núcleo) ✅
- [x] **Turnos :15 exactos, duración 1 h**, con sistema de slots horarios
- [x] Cierre después de medianoche soportado (ej: 08:00 → 01:00)
- [x] Último turno arranca 45 min antes del cierre
- [x] Disponibilidad bloqueada en tiempo real al ocuparse
- [x] Doble reserva imposible (409 server-side; el frontend ya no lo permite)
- [x] Carga manual rápida con creación de cliente in-place
- [x] Bloqueo de horarios (lluvia, mantenimiento, eventos)
- [x] Turnos fijos semanales automáticos (proyección N semanas)
- [x] **Grilla del día** — protagonista visual; mini-grilla calendario por cancha; agrupado por deporte; carrusel horizontal para muchas canchas; barra de ocupación; click en slot → panel de cobro
- [ ] Colchón de 20 min entre turnos (no requerido aún)

## Fase 4 — Socios y beneficios ✅
- [x] Directorio de socios con alta/baja (admin)
- [x] Beneficios con % descuento según disciplina
- [x] Asignación es automática al reservar para socios
- [x] Página de beneficios del complejo (admin)

## Fase 5 — Abonos gym / pileta ✅
- [x] Mensualidad libre: vender desde mostrador, activar solicitud del cliente
- [x] Cliente: pedir mensualidad desde la app (gym o pileta integrados a config)
- [x] Notificaciones automáticas al activar/rechazar
- [x] Registro de ingreso en caja al aprobar
- [ ] Modo "clase suelta" / paquete de clases (legado, se puede re-implementar fácil)
- [ ] Cliente auto-inscripción (hoy solicita, recepción activa manual) — decisión deliberada para evitar cobros no conciliados

## Fase 6 — Caja, cobros y finanzas ✅
- [x] Cobro automático al confirmar (reserva / abono)
- [x] Egresos manuales desde el panel
- [x] Resumen día / semana / mes + desglose por método de pago
- [x] Reportes por disciplina / origen
- [x] Exportar CSV para contabilidad

## Fase 7 — Panel del cliente ✅
- [x] Registro/login
- [x] Mis Reservas — próximos y historial; cancelar in-app con confirmación pro
- [x] Mis Abonos — mensualidades gym/pileta con estado y vencimiento
- [x] Torneos (view público)
- [x] Notificaciones (recordatorios: hoy + mañana)
- [x] Ver/actualizar sus datos básicos de perfil

## Fase 8 — Reportes y estadísticas ✅ (parcial)
- [x] Dashboard: reservas del día, pendientes señña, confirmadas, completadas, ingresos del día, abonos por vencer
- [x] Grilla del día — estados por cancha sin entrar/salir
- [x] Reportes: recaudación por disciplina/origen
- [ ] Gráficos/visualizaciones (charts) — crear visuales con Recharts o equivalente

## Fase 9 — Torneos ✅
- [x] Crear torneo (nombre, deporte, fecha_inicio, premios)
- [x] Equipos y fixture (rondas automáticas)
- [x] Carga de resultados en tiempo real
- [x] Tabla de posiciones calculada automáticamente (3-1-0 pts)
- [x] Página PÚBLICA de torneo (resultado, partidos, tabla)

## Fase 10 — Notificaciones ✅
- [x] Tablas y endpoints básicos
- [x] Recordatorios de turno (POST /notificaciones/procesar-recordatorios desde staff — manual)
- [x] Aviso de suspensión (servicio interno, vía `avisoSuspension`)
- [x] Bandeja cliente in-app con badge en la navbar
- [x] Dedupación por reserva (no repite recordatorios)

## Fase 11 — Pulido y entrega
- [x] README con instrucciones de setup, roles y alcance
- [x] typecheck verde backend y frontend (siempre)
- [x] Dark/light theme completo (sistema de diseño CSS vars + emerald/slate)
- [x] Sistema de diseño consistente (Light mode / Dark mode)
- [x] Componentes unificados (ConfirmDialog, Toast, tablas, encabezados)
- [x] Cliente `/complejo` público con datos reales (horario, configuración, precio mensualidad, amenidades)
- [ ] Wizard `/admin/configurar` rediseñado al lenguaje nuevo (sin funcionalidad colonia, solo lenguaje visual)
- [ ] Deploy y dominio propio
- [ ] Documentación académica — TFI: PDF, screenshots, video/Demo, diagramas, referencias

## Fuera de alcance inicial

- **Integración MercadoPago / WhatsApp** — se deja para la siguiente iteración académica.
- Deploy — el trabajo actual es solo local (localhost:5173 / 3001).
- Tests automatizados — se valida manualmente contra Supabase local en cada feature.
- Gráficos de reportes — hoy el dashboard usa piezas estáticas/CSS del propio panel.

---

**Índice SQL (exactamente en este orden):**
```
docs/schema.sql → docs/rls.sql → docs/seed_deportes.sql
→ docs/configuracion_complejo.sql → docs/notificaciones.sql
→ docs/abonos_mensualidad.sql → docs/indices.sql (opcional)
```
