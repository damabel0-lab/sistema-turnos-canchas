# PlayControl

Sistema de administración de complejos deportivos y canchas individuales: reservas, caja, abonos de gimnasio/pileta, socios, beneficios y torneos.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + TypeScript (Express)
- **Base de datos & Auth:** PostgreSQL alojado en Supabase (service-role desde backend; JWT anon desde frontend)
- **Sistema**: multi-tenant — varios complejos y canchas vinculados a una misma plataforma SaaS con planes mensualidad, trial de 14 días, MRR y suscripción manual/simulada.

## Estructura

```
├── backend/    # API Express (lógica de negocio: precios, caja, turnos fijos)
├── frontend/   # SPA React (panel admin + app del cliente + pública)
└── docs/       # schema del proyecto, migraciones SQL incrementales y documentación
```

## Setup rápido

### 1. Base de datos (Supabase)

Corrés estos SQL **en orden** desde el **SQL Editor**:

1. `docs/schema.sql` — crea las tablas base y los enums (incluye multi-tenancy).
2. `docs/rls.sql` — políticas RLS (conveniente, opcional en desarrollo; hoy toda la lógica pasa por el backend con service-role).
3. `docs/seed_deportes.sql` — deportes predeterminados (fútbol 5/7, pádel, básquet, tenis, gimnasio, pileta — el dueño puede agregar más).
4. `docs/configuracion_complejo.sql` — estado de setup inicial (configuración + valores por complejo).
5. `docs/notificaciones.sql` — bandeja de notificaciones del cliente.
6. `docs/abonos_mensualidad.sql` — servicio y estado del abono mensual (solicitado/activo/cancelado).
7. `docs/indices.sql` — índice para búsquedas frecuentes (opcional, acelera reportes).
8. `docs/multi_tenant_v1.sql` — tablas `complejos`, `complejo_usuarios`, `suscripciones` con backfill.
9. `docs/plataforma_config.sql` — `configuracion_plataforma` (parámetros globales del SaaS).
10. `docs/torneos_v2.sql` — modalidad/formato/cupo/cuota/jugadores por equipo/cancha para torneos.

### 2. Variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:
```
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
PORT=3001
```

`frontend/.env`:
```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

El archivo `.env` está en `.gitignore` y no se commitea por diseño.

### 3. Instalar y correr

```bash
npm install

# Terminal 1 — backend (puerto 3001)
npm run dev:backend

# Terminal 2 — frontend (puerto 5173)
npm run dev:frontend
```

Abrí **http://localhost:5173** y entrar con un usuario de prueba (`admin.playcontrol@gmail.com` / `Admin123456` — super_admin plataforma; o `cliente.demo@mail.com` / `Demo1234` — jugadora cliente). El super_admin ve solo `/admin/plataforma`; el dueño completo de un complejo entra al panel de su complejo; el cliente solo ve el aplicativo de reservas.

## Roles

Existen **dos capas** de rol:

**Rol de plataforma** (en `usuarios.rol`, global):
- **super_admin** — propietario del SaaS. Entra a `/admin/plataforma` para activar/suspender complejos y ver MRR/ingresos. No administra turnos ni reservas de ningún complejo.
- **cliente** — usuario final. Sin privilegios de gestión.

**Rol dentro de un complejo** (en `complejo_usuarios.rol`, relacional; la misma cuenta puede tener ambos):
- **dueno** — administra su complejo: deportes/canchas, tarifas, personal, abonos, socios, caja, reportes, torneos, configuración, pública en catálogo.
- **recepcionista** — staff de mostrador en ese complejo: grilla del día, reservas, socios, abonos, torneos, caja diaria.
- (Ausente = **cliente** del complejo: ver, reservar, pagar, abonos, torneos, notificaciones.)

| Rol | Qué puede hacer |
|---|---|
| **super_admin (plataforma)** | Activar/renovar/suspender planes mensuales, ver MRR y suscripciones de todos los complejos. No puede editar ni ver negocios ajenos |
| **dueño del complejo** | Panel completo (caja, reportes, suscripciones familiares) en su complejo. Ve/ajusta su suscripción |
| **recepcionista** | Operativa diaria del complejo: grilla, reservas, socios, abonos, torneos |
| **cliente** | Reservar en 3 clicks, ver mis reservas, mis abonos, torneos (si el complejo los ofrece), notificaciones |

## Módulos implementados

- **Reservas:** disponibilidad en vivo, slots en cuartos de hora, 1 hora exacta por turno, bloqueos y eventos, doble reserva imposible (servidor valida), carga rápida por teléfono, estados (pendiente seña → confirmada → completada / cancelada).
- **Grilla del día:** tarjeta por cancha agrupada por deporte con carril horizontal y ocupación visual, arqueo rápido por reserva, carga de turnos fijos y bloqueos sin salir de la pantalla.
- **Reservar:** flujo UX en 3 clicks (deporte → cancha → horario) con resumen sticky y turno fijo semanal opcional.
- **Caja:** movimientos automáticos al confirmar / completar, resumen por disciplina/origen, egresos manuales, export CSV.
- **Canchas y tarifas:** alta y gestión de canchas y deportes, precios base, seña opcional, cotizador con descuentos por socio y turno fijo.
- **Socios y beneficios:** directorio de socios, catálogo de beneficios, descuento automático y asignación por disciplina.
- **Abonos (gimnasio / pileta):** mensualidad libre o por clases, solicitud in-app del cliente, activación al pasar por recepción con cobro, estadística de uso para el complejo.
- **Torneos:** crear torneo, equipos, fixture, carga de resultados, tabla automática.
- **Notificaciones:** recordatorios de turno, avisos de suspensión (lluvia), bandeja del cliente con badge.
- **Configuración completa por el dueño:** nombre, horario de apertura/cierre (overnight OK), tarifa, amenidades (gym/pileta), socios, `ofrece_torneos` — todo apagable/preconfigurable.
- **Reportes:** recaudación por disciplina/origen, cierres por método de pago.

## Cómo trabajamos

De los commits reales reunidos en este repositorio (`git log`) se desprende una forma de trabajo muy específica — la documentamos para que un tercero entienda lo que ve:

### 1. Iteración vertical por módulo
Cada bloque funcional llega de punta a punta antes de pasar al siguiente: schema SQL → migración idempotente en Supabase → backend (`modules/<modulo>/<modulo>.routes.ts` + `<modulo>.service.ts` + (o no) lógica de plataforma) → frontend (`hooks`, `pages`) → verificación `npm run typecheck && npm run build` en ambos workspaces. No hay "primera etapa con el backend hueco" ni "primero se diseña el frontend y después la base".

### 2. Modulares, no monolíticos
Cada dominio de negocio (`reservas`, `abonos`, `torneos`, `caja`, `socios`, `beneficios`, `deportes`, `canchas`, `suscripciones`, `complejos`, `notifications`, `bloqueos`, `dashboard`, `config`, `setup`, `configuracion-plataforma`) tiene su propio directorio bajo `backend/src/modules/` con el par `routes` + `service`. Así:
- Una contribución nueva cambia un solo módulo.
- El código dice qué busca (`grep -ri "requireStaff" backend/src/modules/abonos/`).
- La arquitectura es multi-tenant explícita (`complejo_id` en cada tabla vía migración).

### 3. Alternancia entre Nahuel y Damián
- Aproximadamente 50 / 50 de commits, con pequeños desvíos puntuales en favor de quien arranca una feature completa.
- Cada commit se hace con la identidad de su autor (`-c user.name / user.email`).
- Es un único repo, una sola rama (`main`); no hay ramas de feature.

### 4. Ciclo de cada sesión
1. **Levantamiento**: `npm run dev:backend` y `npm run dev:frontend` como procesos en segundo plano.
2. **Reset de la base** cuando se quiere un seed nuevo: borrado explícito de complejos / usuarios / membresías / suscripciones y re-sembrado. Cada reset guarda un `dump` previo (timestamped) en disco por seguridad (`AppData/Local/Temp/playcontrol-reset-*.json`).
3. **Verificación**: SQL ejecutado en Supabase SQL Editor con `BEGIN…COMMIT` y bloques de verificación `SELECT` después (`docs/*.sql`).
4. **Build codiciado**: después de cada cambio funcional se corre `npm run typecheck && npm run build` en backend y frontend; solo se commitea con build verde.
5. **Commits internos**: una feature se sienta internamente durante varias iteraciones; cada iteración es un commit pequeño (`fix`, `feat`, `style`, `docs`, `refactor`, `chore`) anotado en español.
6. **Push a GitHub**: solo con autorización explícita del otro, normalmente tras terminar un bloque (multi-tenant v1, wizard persistente, plataforma admin). Antes de pushear: `git log origin/main..HEAD` muestra exactamente qué sube.
7. **Pausas para análisis**: cuando algo se rompe en pantalla (ej. la home del super_admin estaba enganchado al wizard), se detiene el avance y la próxima sesión se dedica a análisis en frío: enumerar hipótesis, comprobar en vivo con Account en Supabase, proponer dos o tres soluciones, descartar una por una antes de tocar código.

### 5. Sistema de rastreo
- **Correos como identidad**: `nahuelmartingauna366@gmail.com`, `damyabel0@gmail.com`.
- **`.env` nunca en Git** (`.env.example` como referencia).
- **Sin "TODO" sueltos en producción**: los pendientes van al final de este README o son abandonados — no se commitean comentarios `// TODO`.

### 6. Diseño
Paleta verde/emerald (sistema de variables CSS en `global.css`). Tema claro/oscuro. Sin Tailwind desde el principio; todo es CSS personalizado para tener control fino.

### 7. Convenciones puntuales
- Commits en español, formato convencional: `<tipo>(<modulo>): <razón corta>`. Tipos habituales: `feat`, `fix`, `style`, `refactor`, `chore`, `docs`.
- Los commits internos se hacen en bloques pequeños aunque estén un poco "feos" (desmontes, comentarios); así nunca se pierde el hilo de lo que se hizo hoy.
- Push a GitHub **solo bajo autorización explícita** del usuario: nada en `origin` cambia sin que él lo autorice.
- Cada commit lleva la identidad del autor que correspondía al turno (`-c user.name / user.email`), no la del sistema.

## Pendiente (fuera de alcance inicial)

- **Integración de pagos online (MercadoPago / WhatsApp).**
- **Deploy a producción** — actualmente corre en localhost; el despliegue es automático por push tras la entrega académica.
- **RLS estricto** — políticas mínimas en tablas de datos compartidos; hoy todo pasa por el backend (service role).
- **Tests automáticos** — se valida manualmente contra Supabase local; sin suite automatizada.
- **Reporte de gastos / cotización PDF** — consulta económica minimalista interna.

