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
├── docs/       # schema.sql de la base de datos y documentación
```

## Setup

1. Copiar `.env.example` a `.env` en `backend/` y `frontend/`, y completar con las claves de Supabase.
2. Correr el `docs/schema.sql` en el SQL Editor de Supabase.
3. `npm install` en la raíz (workspaces), o en `backend/` y `frontend/` por separado.
4. Levantar: `npm run dev` (backend en :3001, frontend en :5173).

## Roles

- **super_admin** — finanzas, reportes, precios, configuración.
- **recepcionista** — grilla del día, reservas y cobros.
- **cliente** — reservas online, abonos, torneos.
