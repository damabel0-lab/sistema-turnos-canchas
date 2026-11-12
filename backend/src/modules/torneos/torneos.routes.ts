import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  AuthedRequest,
  requireStaff,
  requireOwner,
  complejoIdRequerido,
} from '../../middleware/auth.js';
import {
  listarTorneos,
  crearTorneo,
  listarTorneosActivos,
  listarInscripciones,
  inscribirIndividual,
  crearEquipoConCapitan,
  cancelarInscripcionIndividual,
  cancelarEquipo,
  generarFixture,
  listarPartidos,
  cargarResultadoPartido,
  tablaPosiciones,
  finalizarTorneo,
  obtenerTorneoConConteos,
} from './torneos.service.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const torneosRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

// GET /torneos -> listado completo del complejo activo (staff)
torneosRouter.get(
  '/',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarTorneos(cid));
  }),
);

// GET /torneos/activos -> torneos abiertos a participantes (público autenticado, complejos vigentes)
torneosRouter.get(
  '/activos',
  h(async (_req, res) => {
    res.json(await listarTorneosActivos());
  }),
);

// GET /torneos/:id -> detalle + conteos (público; complejos vigentes)
torneosRouter.get(
  '/:id',
  h(async (req, res) => {
    res.json(await obtenerTorneoConConteos(Number(req.params.id)));
  }),
);

// POST /torneos -> crear torneo (DUEÑO del complejo activo)
torneosRouter.post(
  '/',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await crearTorneo(req.body, cid));
  }),
);

/* ===== Inscripciones ===== */

// POST /torneos/:id/inscribirse -> inscribirme (individual o crear mi equipo)
torneosRouter.post(
  '/:id/inscribirse',
  h(async (req, res) => {
    const modalidad = (req.body?.modalidad as string | undefined) ?? 'auto';
    const usuarioId = req.userId!;
    const torneoId = Number(req.params.id);
    const { data: torneo } = await getTorneoInfo(torneoId);
    if (!torneo) {
      res.status(404).json({ error: 'Torneo no encontrado' });
      return;
    }
    if (torneo.modalidad === 'individual' || modalidad === 'individual') {
      res.status(201).json(await inscribirIndividual(torneoId, usuarioId));
      return;
    }
    const nombreEquipo: string = String(req.body?.nombre_equipo ?? '').trim();
    if (!nombreEquipo) {
      res.status(400).json({ error: 'El nombre de tu equipo es obligatorio' });
      return;
    }
    res.status(201).json(await crearEquipoConCapitan(torneoId, usuarioId, nombreEquipo));
  }),
);

// DELETE /torneos/:id/inscribirse -> cancelar mi inscripción
torneosRouter.delete(
  '/:id/inscribirse',
  h(async (req, res) => {
    res.json(await cancelarInscripcionIndividual(Number(req.params.id), req.userId!));
  }),
);

// DELETE /torneos/:id/equipos/:equipoId -> cancelar un equipo propio (o staff de ESE complejo)
torneosRouter.delete(
  '/:id/equipos/:equipoId',
  h(async (req, res) => {
    const esStaff = req.rol === 'super_admin' || req.rolComplejo != null;
    res.json(
      await cancelarEquipo(
        Number(req.params.id),
        Number(req.params.equipoId),
        req.userId!,
        esStaff,
        req.complejoId ?? undefined,
      ),
    );
  }),
);

// GET /torneos/:id/inscripciones -> listado de equipos/inscriptos (público; complejos vigentes)
torneosRouter.get(
  '/:id/inscripciones',
  h(async (req, res) => {
    res.json(await listarInscripciones(Number(req.params.id)));
  }),
);

/* ===== Fixture y tabla ===== */

// POST /torneos/:id/fixture -> generar eliminatoria o todos_contra_todos (staff del complejo activo)
torneosRouter.post(
  '/:id/fixture',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await generarFixture(Number(req.params.id), cid));
  }),
);

// POST /torneos/:id/finalizar -> cerrar torneo (DUEÑO del complejo activo)
torneosRouter.post(
  '/:id/finalizar',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await finalizarTorneo(Number(req.params.id), cid));
  }),
);

// GET /torneos/:id/partidos -> fixture
torneosRouter.get(
  '/:id/partidos',
  h(async (req, res) => {
    res.json(await listarPartidos(Number(req.params.id)));
  }),
);

// PATCH /torneos/partidos/:partidoId -> cargar resultado (staff del complejo del torneo)
torneosRouter.patch(
  '/partidos/:partidoId',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const { goles_local, goles_visitante, jugado } = req.body ?? {};
    res.json(
      await cargarResultadoPartido(
        Number(req.params.partidoId),
        Number(goles_local),
        Number(goles_visitante),
        Boolean(jugado),
        cid,
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
  const { data } = await supabaseAdmin
    .from('torneos')
    .select('id, modalidad, estado')
    .eq('id', id)
    .maybeSingle();
  return { data };
}
