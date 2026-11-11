import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthedRequest, requireSuperAdmin, requireStaff } from '../../middleware/auth.js';
import {
  listarTorneos,
  crearTorneo,
  listarTorneosActivos,
  listarInscripciones,
  inscribirIndividual,
  crearEquipoConCapitan,
  cancelarInscripcionIndividual,
  cancelarEquipo,
  generarFixtureAllVsAll,
  listarPartidos,
  cargarResultadoPartido,
  tablaPosiciones,
  finalizarTorneo,
  obtenerTorneoConConteos,
} from './torneos.service.js';

export const torneosRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /torneos -> listado completo (staff)
torneosRouter.get(
  '/',
  requireStaff,
  h(async (_req, res) => {
    res.json(await listarTorneos());
  }),
);

// GET /torneos/activos -> torneos abiertos a participantes (público autenticado)
torneosRouter.get(
  '/activos',
  h(async (_req, res) => {
    res.json(await listarTorneosActivos());
  }),
);

// GET /torneos/:id -> detalle + conteos (público)
torneosRouter.get(
  '/:id',
  h(async (req, res) => {
    res.json(await obtenerTorneoConConteos(Number(req.params.id)));
  }),
);

// POST /torneos -> crear torneo (solo administradores)
torneosRouter.post(
  '/',
  requireSuperAdmin,
  h(async (req, res) => {
    res.status(201).json(await crearTorneo(req.body));
  }),
);

/* ===== Inscripciones ===== */

// POST /torneos/:id/inscribirse -> inscribirme (individual o crear mi equipo)
torneosRouter.post(
  '/:id/inscribirse',
  h(async (req: AuthedRequest, res) => {
    const modalidad = (req.body?.modalidad as string | undefined) ?? 'auto';
    const usuarioId = req.userId!;
    const { data: torneo } = await getTorneoInfo(Number(req.params.id));
    if (!torneo) {
      res.status(404).json({ error: 'Torneo no encontrado' });
      return;
    }
    if (torneo.modalidad === 'individual') {
      res.status(201).json(await inscribirIndividual(Number(req.params.id), usuarioId));
      return;
    }
    const nombreEquipo: string = String(req.body?.nombre_equipo ?? '').trim();
    if (!nombreEquipo) {
      res.status(400).json({ error: 'El nombre de tu equipo es obligatorio' });
      return;
    }
    res.status(201).json(await crearEquipoConCapitan(Number(req.params.id), usuarioId, nombreEquipo));
  }),
);

// DELETE /torneos/:id/inscribirse -> cancelar mi inscripción
torneosRouter.delete(
  '/:id/inscribirse',
  h(async (req: AuthedRequest, res) => {
    res.json(await cancelarInscripcionIndividual(Number(req.params.id), req.userId!));
  }),
);

// DELETE /torneos/:id/equipos/:equipoId -> cancelar un equipo propio (o staff)
torneosRouter.delete(
  '/:id/equipos/:equipoId',
  h(async (req: AuthedRequest, res) => {
    const esStaff = req.rol === 'super_admin' || req.rol === 'recepcionista';
    res.json(await cancelarEquipo(Number(req.params.id), Number(req.params.equipoId), req.userId!, esStaff));
  }),
);

// GET /torneos/:id/inscripciones -> listado de equipos/inscriptos (público)
torneosRouter.get(
  '/:id/inscripciones',
  h(async (req, res) => {
    res.json(await listarInscripciones(Number(req.params.id)));
  }),
);

/* ===== Fixture y tabla ===== */

// POST /torneos/:id/fixture -> generar (staff)
torneosRouter.post(
  '/:id/fixture',
  requireStaff,
  h(async (req, res) => {
    res.json(await generarFixtureAllVsAll(Number(req.params.id)));
  }),
);

// POST /torneos/:id/finalizar -> cerrar torneo
torneosRouter.post(
  '/:id/finalizar',
  requireSuperAdmin,
  h(async (req, res) => {
    res.json(await finalizarTorneo(Number(req.params.id)));
  }),
);

// GET /torneos/:id/partidos -> fixture
torneosRouter.get(
  '/:id/partidos',
  h(async (req, res) => {
    res.json(await listarPartidos(Number(req.params.id)));
  }),
);

// PATCH /torneos/partidos/:partidoId -> cargar resultado (staff)
torneosRouter.patch(
  '/partidos/:partidoId',
  requireStaff,
  h(async (req, res) => {
    const { goles_local, goles_visitante, jugado } = req.body ?? {};
    res.json(
      await cargarResultadoPartido(
        Number(req.params.partidoId),
        Number(goles_local),
        Number(goles_visitante),
        Boolean(jugado),
      ),
    );
  }),
);

// GET /torneos/:id/tabla -> tabla de posiciones
torneosRouter.get(
  '/:id/tabla',
  h(async (req, res) => {
    res.json(await tablaPosiciones(Number(req.params.id)));
  }),
);

/** Helper: traer solo la info mínima del torneo para la inscripción */
async function getTorneoInfo(id: number) {
  const { supabaseAdmin } = await import('../../config/supabase.js');
  const { data } = await supabaseAdmin
    .from('torneos')
    .select('id, modalidad, estado')
    .eq('id', id)
    .single();
  return { data };
}
