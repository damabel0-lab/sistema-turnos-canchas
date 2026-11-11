# PlayControl — Limpieza de datos de prueba antes de entrega

> **Importante:** este documento es para revisar desde afuera antes de ejecutar nada destructivo.
> El archivo SQL no hace nada como está — cada delete está **comentado** con su `--`; hay que revisarlo uno por uno y descomentar de a uno.
> Los DELETEs van en transacción (`BEGIN`/`COMMIT`): si algo no cuadra, `ROLLBACK` te devuelve la base tal cual.

## Qué está "sucio" hoy (puntos de datos que no son productivos)

Tablas con filas que quedaron de probar/demostrar:

| Tabla | Detalle | Observación |
|---|---|---|
| `reservas` | varias (IDs conocidos por pruebas) | incluyen turnos cancelados y una `#11` 12:15 confirmada de hoy |
| `movimientos_caja` | id 7 (+$20.000, `Abono Gimnasio mensual`) | ingreso demo; puede conservarse si el complejo lo comprará también |
| `abonos` | id 1 (gym, activo, $20.000, vence 2026-12-11) | prueba de solicitud/aprobación de mensualidad |
| `clientes` | ninguno de los usuarios es "real" | todas las cuentas son de prueba (`admin.playcontrol@gmail.com`, `prueba.playcontrol@gmail.com`) |
| `notificaciones` | generada automáticamente por recordatorios manuales | puede quedar (se regenera desde cero la próxima pasada) |
| `configuracion_valores` | datos del complejo CLUB DE AMIGO 1886 | es tuyo, queda |

La tabla `partidos_torneo` y `equipos_torneo` también tienen datos de prueba si crearon torneos via admin.

## Ruta A — Mantener la demo viva (recomendado para mostrar el proyecto)

Si el profesor/inspector va a ver la demo, **no borres nada**. En su lugar:

1. Dejá los movimientos a $0 o dejá que la lógica de negocio producción opere naturalmente a partir de la demo.
2. Usá una segunda cuenta con rol `super_admin` para las pruebas de entrega.
3. Cuando termine la entrega, pedí un `DROP SCHEMA public CASCADE` vía email a Supabase support para comenzar desde cero — requiere confirmación humana.

## Ruta B — Resetear para producción (vaciado controlado)

**ANTES DE EJECUTAR:** Supabase tiene siempre backups automáticos (en una cuenta gratis se retienen 7 días). Si te arrepintís en los próximos 7 días, подес restaurarlos.

### Paso 1 — Identificá los IDs de usuarios que son "del complejo" vs "de prueba"

Tu complejo debe tener exactamente estos usuarios reales:
- `admin.playcontrol@gmail.com` (super_admin) o el owner real del TFI
- Si el docente va a entrar, agregale cuenta propia `profesor@ejemplo.com`

**Todos los demás emails son de prueba** y pueden ser eliminados:
- `prueba.playcontrol@gmail.com`
- Cuentas de cliente fantasma creadas por cargas manuales de turnos

### Paso 2 — Parche de limpieza (SQL transaccional, ejecutar de a pasos)

**NO EJECUTAR DIRECTAMENTE.** Descomentar línea por línea, revisar, y en cada paso de la transacción verificar `SELECT count(*)` antes de avanzar al siguiente.

```sql
BEGIN;

-- (a) Borralos turnos de prueba (mantené el tuyo si lo necesitás)
-- SELECT id FROM reservas ORDER BY id;  -- primero revisá SOLO-EL ID
-- DELETE FROM reservas WHERE usuario_id = '<UUID-cliente-prueba>';

-- (b) Limpia movimientos de prueba
-- SELECT id FROM movimientos_caja ORDER BY id;  -- revisar
-- DELETE FROM movimientos_caja WHERE reserva_id IS NULL;  -- cuidado: incluye abonos
-- Si preferís borrar solo el específico: DELETE FROM movimientos_caja WHERE id = 7;

-- (c) Anulá el abono de prueba
-- SELECT id FROM abonos;  -- revisar
-- DELETE FROM abonos WHERE id = 1;

-- (d) Borrar notificaciones
-- DELETE FROM notificaciones;  -- o no borrar: se regenera sola

-- Si todo se ve bien hasta acá, COMMIT; si algo sale mal, ROLLBACK.
ROLLBACK;
```

### Paso 3 — Volver a correr datos limpios para demo

Si necesitás demostrar el sistema con datos reales, hay que volver a semilla (despues de la limpieza):
- Deportes: están en `docs/seed_deportes.sql` (solo hay que correrla).
- Un par de canchas para que se vea la grilla una vez configurado.
- Evitar: crear movimientos_caja y abonos manual porque ensucia el camino. Naturalmente se alimentan del uso real.

### Paso 4 — Verificación final

```sql
SELECT 'usuarios' AS tabla, count(*) FROM public.usuarios
UNION ALL SELECT 'reservas', count(*) FROM public.reservas
UNION ALL SELECT 'abonos', count(*) FROM public.abonos
UNION ALL SELECT 'movimientos_caja', count(*) FROM public.movimientos_caja
UNION ALL SELECT 'notificaciones', count(*) FROM public.notificaciones;
```
Esperás filas semilla + exactamente tu cuenta.

## Ningún paso en este archivo se ejecuta por el sistema ni por GitHub Actions

Los DELETE están comentados, y la ejecución requiere que vos lo ejecutes. El BOT nunca corre nada sobre la base de producción sin el tuyo `OK` paso a paso.
