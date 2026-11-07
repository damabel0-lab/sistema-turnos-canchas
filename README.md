# PlayControl

Sistema de administración de complejos deportivos y canchas individuales: reservas, cobros, panel de finanzas, socios, abonos de gimnasio/pileta y torneos.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + TypeScript (Express)
- **DB & Auth:** PostgreSQL alojado en Supabase
- **Control de versiones:** Git + GitHub

## Estructura

```
├── backend/    # API Express (lógica de negocio: precios, caja, turnos fijos)
├── frontend/   # SPA React (panel admin + app del cliente)
├── docs/       # schema.sql, rls.sql, seed_deportes.sql y documentación
```

## Setup rápido

### 1. Base de datos (Supabase)
Creá un proyecto en [Supabase](https://supabase.com) y corré en el **SQL Editor**:

1. `docs/schema.sql` — crea las 13 tablas y los 4 enums.
2. `docs/rls.sql` — políticas de Row Level Security (usuarios ven solo lo suyo).
3. `docs/seed_deportes.sql` — deportes predeterminados (fútbol sintético 5/7, pádel, básquet, tenis, gimnasio, pileta).

### 2. Variables de entorno

Copiá los ejemplos y completá con tus claves de Supabase (API Keys → Project URL, publishable key y service role key):

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

> Los archivos `.env` están en `.gitignore` y **no se suben a GitHub**.

### 3. Instalar y correr

```bash
# Desde la raíz del proyecto
npm install

# Terminal 1 — backend (puerto 3001)
npm run dev:backend

# Terminal 2 — frontend (puerto 5173)
npm run dev:frontend
```

Abrí **http://localhost:5173** en el navegador.

## Roles

| Rol | Qué puede hacer |
|---|---|
| **super_admin** | Finanzas, reportes, precios, canchas, deportes, socios, beneficios, caja, torneos, usuarios |
| **recepcionista** | Grilla del día, reservas (carga manual), cobros, bloqueos, socios, beneficios, torneos |
| **cliente** | Reservar en 3 clicks, ver mis reservas, mis abonos, mis torneos, notificaciones |

## Módulos implementados

- **Reservas:** grilla visual por cancha, disponibilidad en tiempo real, creación con validación de doble reserva, bloqueos, carga manual por teléfono, estados (pendiente seña → confirmada → completada / cancelada).
- **Caja:** movimientos automáticos al confirmar/completar reservas, resumen día/semana/mes, desglose por método de pago y por origen, egresos manuales, arqueo.
- **Canchas y tarifas:** alta de canchas, deportes predeterminados y personalizados, precios base, tarifas por día de la semana y franja horaria, seña opcional.
- **Socios y beneficios:** directorio de socios, catálogo de beneficios con % de descuento, asignación a socios.
- **Abonos (gimnasio / pileta):** venta de abonos por clases o mensual, consumo de clases al reservar, accesos restantes para el cliente.
- **Torneos:** crear torneo, equipos, fixture, carga de resultados, tabla de posiciones.
- **Notificaciones:** recordatorios de turno, avisos de suspensión (lluvia), bandeja del cliente.
- **Reportes:** recaudación por disciplina/origen por fecha.

## Forma de trabajo (equipo de 2)

- Commits intercalados: 2 de Nahuel → 2 de Damian → 2 de Nahuel → 2 de Damian.
- Cada commit se hace con la identidad de quien le toca el turno.
- Mensajes en español con formato convencional: `feat(modulo): ...`, `fix(modulo): ...`, `chore: ...`, `docs: ...`.
- El push a GitHub se hace con autorización previa.
