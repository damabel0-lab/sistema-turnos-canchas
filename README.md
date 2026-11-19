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

PlayControl lo hicimos Nahuel y Damián, de punta a punta. No hubo diseñador, no hubo oficina ni cliente: lo que se ve hoy es el resultado de sesiones de trabajo en las que armábamos un tema completo por vez y recién pasábamos al siguiente cuando el anterior andaba.

Los dos trabajamos sobre la misma rama y nos repartimos los commits más o menos en partes iguales. Intentamos que cada uno tome los temas completos: por ejemplo, uno arma toda la parte de torneos (pantalla, lógica y base) y el otro se encarga de otra cosa, en vez de mezclar los dos las mismas pantallas. Cada commit lo firma el que hizo ese pedazo, y casi siempre los commits van chicos, con el mensaje en español y un prefijo que dice de qué se trata (`feat`, `fix`, `docs`, etc.).

Algunos de los temas que fuimos resolviendo, en orden más o menos real:

- El modelado de la base de datos (complejos, canchas, reservas, socios, abonos, torneos, caja) y los permisos de acceso.
- El sistema de reservas, con disponibilidad en vivo y doble reserva imposible.
- El panel del dueño del complejo: grilla del día, canchas, tarifas, socios, caja, abonos y reportes.
- La app del jugador: explorar complejos, reservar, ver sus turnos, sus abonos y sus torneos.
- El login y los roles, y las pantallas de recuperación de contraseña (simulada, sin envío real de mails).
- Toda la parte de administración de la plataforma: suscripciones, planes mensuales, el cobro manual y el panel para activar/suspender complejos.
- El asistente de configuración de 8 pasos para complejos nuevos y el rediseño de las páginas públicas.

El flujo es siempre el mismo: probarlo en local, arreglar lo que falle, recién ahí hacer commit. Los cambios no se suben a GitHub hasta que un bloque queda terminado y verificado — mientras tanto el trabajo vive como commits internos. Y los datos de prueba los limpiamos más de una vez porque se desordenaban; antes de cada limpieza guardamos respaldos.

El diseño es propio: paleta verde, tema claro y oscuro, CSS hecho a mano. Preferimos tener el control del detalle antes que sumar un framework.

## Pendiente (fuera de alcance inicial)

- **Integración de pagos online (MercadoPago / WhatsApp).**
- **Deploy a producción** — actualmente corre en localhost; el despliegue es automático por push tras la entrega académica.
- **RLS estricto** — políticas mínimas en tablas de datos compartidos; hoy todo pasa por el backend (service role).
- **Tests automáticos** — se valida manualmente contra Supabase local; sin suite automatizada.
- **Reporte de gastos / cotización PDF** — consulta económica minimalista interna.

