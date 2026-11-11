# PlayControl

Sistema de administración de complejos deportivos y canchas individuales: reservas, caja, abonos de gimnasio/pileta, socios, beneficios y torneos.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + TypeScript (Express)
- **Base de datos & Auth:** PostgreSQL alojado en Supabase

## Estructura

```
├── backend/    # API Express (lógica de negocio: precios, caja, turnos fijos)
├── frontend/   # SPA React (panel admin + app del cliente + pública)
└── docs/       # schema del proyecto, migraciones SQL incrementales y documentación
```

## Setup rápido

### 1. Base de datos (Supabase)

Creá un proyecto en [Supabase](https://supabase.com) y corré estos SQL **en orden** desde el **SQL Editor**:

1. `docs/schema.sql` — crea las tablas base y los enums.
2. `docs/rls.sql` — políticas RLS (conveniente, opcional en desarrollo).
3. `docs/seed_deportes.sql` — deportes predeterminados (fútbol 5/7, pádel, básquet, tenis, gimnasio, pileta).
4. `docs/configuracion_complejo.sql` — estado de setup inicial (configuración principal + valores).
5. `docs/notificaciones.sql` — bandeja de notificaciones del cliente.
6. `docs/abonos_mensualidad.sql` — servicio y estado del abono mensual (solicitado/activo/cancelado).
7. `docs/indices.sql` — índice para búsquedas frecuentes (opcional, acelera reportes).

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

Abrí **http://localhost:5173** y entrar con un usuario de prueba (`admin.playcontrol@gmail.com` / `Admin123456` — super_admin; o crear uno nuevo en el mismo registro) — el sistema verificará que el setup esté completo al entrar el dueño y, si no, te lleva al asistente `/admin/configurar`.

## Roles

| Rol | Qué puede hacer |
|---|---|
| **super_admin** | Finanzas, reportes, precios, canchas, deportes, socios, beneficios, caja, torneos, usuarios, configuración |
| **recepcionista** | Grilla del día, reservas (carga manual), cobros, bloqueos, socios, beneficios, torneos |
| **cliente** | Reservar en 3 clicks, ver mis reservas, mis abonos, mis torneos, notificaciones |

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

## Forma de trabajo

- Commits en español con convención `feat(modulo)`, `fix(modulo)`, `docs`, `chore`.
- Convención de alternancia: aproximadamente 2 commits de Nahuel → 2 de Damian, no estricta; cada uno se queda con el módulo que arranca.
- Push a GitHub tras un avance importante terminado y verificado; hasta entonces el trabajo queda en commits locales internos.
- El autor decide qué commits van juntos en el push final; la revisión es interna antes de PUBLICAR.

## Pendiente (fuera de alcance inicial)

- **Integración de pagos online (MercadoPago / WhatsApp).**
- **Deploy a producción** — actualmente corre en localhost; el despliegue es automático por push tras la entrega académica.
- **RLS estricto** — políticas mínimas en tablas de datos compartidos; hoy todo pasa por el backend (service role).
- **Tests automáticos** — se valida manualmente contra Supabase local; sin suite automatizada.
- **Reporte de gastos / cotización PDF** — consulta económica minimalista interna.

